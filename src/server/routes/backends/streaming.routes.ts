import { errorGuard } from '@/server/middleware/errorGuard';
import { generateHandler } from '@/server/backends/chat-completions';
import { ollamaStreamToReadable, passthroughSSE } from '@/server/services/streaming.service';
import type { ChatCompletionRequest } from '@/shared/types/backends/chatcompletions';
import { ChatCompletionRequestSchema } from '@/shared/schemas/backends/chatcompletions';

export const streamingRoutes = {
  chatStream: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json();
    const parsed = ChatCompletionRequestSchema.parse(body);

    // streaming === false → user has token streaming disabled in UI; return whole JSON
    if (parsed.streaming === false) {
      const nonStreamReq: ChatCompletionRequest = { ...parsed, stream: false };
      const response = await generateHandler(nonStreamReq);
      // Return the upstream body as-is. Ollama adapter forwards stream: req.stream,
      // so it returns a single NDJSON/JSON object. Other adapters return OpenAI-shape
      // JSON. Keep upstream Content-Type if it's JSON, otherwise force application/json.
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

    const source = parsed.chat_completion_source;

    if (source === 'ollama') {
      const response = await generateHandler(streamReq);
      const stream = await ollamaStreamToReadable(response);
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    const response = await generateHandler(streamReq);
    const stream = passthroughSSE(response);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }),
};
