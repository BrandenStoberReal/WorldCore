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
    console.log('[textStream] request:', JSON.stringify(parsed).slice(0, 500));
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
