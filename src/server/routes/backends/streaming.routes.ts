import { errorGuard } from '@/server/middleware/errorGuard';
import { generateHandler as chatGenerateHandler } from '@/server/backends/chat-completions';
import { generateHandler as textGenerateHandler } from '@/server/backends/text-completions';
import { ollamaStreamToReadable, passthroughSSE } from '@/server/services/streaming.service';
import type { ChatCompletionRequest } from '@/shared/types/backends/chatcompletions';
import { ChatCompletionRequestSchema } from '@/shared/schemas/backends/chatcompletions';
import type { TextCompletionRequest } from '@/shared/types/backends/textcompletions';
import { TextCompletionRequestSchema } from '@/shared/schemas/backends/textcompletions';

const STREAM_HEADERS: HeadersInit = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

const STREAM_INIT = { idleTimeout: 0, headers: STREAM_HEADERS } as ResponseInit & {
  idleTimeout: number;
};

export const streamingRoutes = {
  chatStream: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as Record<string, unknown>;
    const source = body.chat_completion_source as string | undefined;

    const parsed = ChatCompletionRequestSchema.parse(body);

    // Propagate the incoming client-disconnect signal to the upstream adapter
    // so the LLM fetch aborts when the browser tab closes/backgrounds and the
    // connection drops. Adapters pass `req.signal` straight into their fetch();
    // without this, abandoned clients leave the upstream (eg. llama.cpp)
    // generating into a dead socket — wasting GPU and, on backends with a
    // single in-flight slot, blocking every subsequent request.
    (parsed as Record<string, unknown>).signal = req.signal;

    if (parsed.streaming === false) {
      const nonStreamReq: ChatCompletionRequest = { ...parsed, stream: false };
      const response = await chatGenerateHandler(nonStreamReq);
      const ct = response.headers.get('Content-Type') ?? '';
      const headers: Record<string, string> = {
        'Content-Type': ct.includes('application/json') ? ct : 'application/json',
      };
      return new Response(response.body, { status: response.status, headers });
    }

    const streamReq: ChatCompletionRequest = {
      ...parsed,
      stream: true,
    };
    // The spread above copied the signal through, but be explicit so a future
    // schema change cannot silently drop it.
    (streamReq as Record<string, unknown>).signal = req.signal;

    const response = await chatGenerateHandler(streamReq);

    if (!response.ok) {
      const errText = await response
        .clone()
        .text()
        .catch(() => '');
      console.error(`[chatStream] upstream ${response.status}:`, errText.slice(0, 500));
      return new Response(
        JSON.stringify({
          error: { code: 'UPSTREAM_ERROR', message: `Upstream error ${response.status}` },
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (source === 'ollama') {
      const stream = await ollamaStreamToReadable(response);
      return new Response(stream, STREAM_INIT);
    }

    const stream = passthroughSSE(response);
    return new Response(stream, STREAM_INIT);
  }),

  textStream: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json();
    const parsed = TextCompletionRequestSchema.parse(body);
    (parsed as Record<string, unknown>).signal = req.signal;
    const response = await textGenerateHandler(parsed as TextCompletionRequest);
    if (!response.ok) {
      const errText = await response
        .clone()
        .text()
        .catch(() => '');
      console.error(`[textStream] upstream ${response.status}:`, errText.slice(0, 500));
      return new Response(
        JSON.stringify({
          error: { code: 'UPSTREAM_ERROR', message: `Upstream error ${response.status}` },
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(response.body, STREAM_INIT);
  }),
};
