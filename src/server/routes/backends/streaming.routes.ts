import { generateHandler } from '@/server/backends/chat-completions';
import { ollamaStreamToReadable, passthroughSSE } from '@/server/services/streaming.service';
import type { ChatCompletionRequest } from '@/shared/types/backends/chatcompletions';
import { ChatCompletionRequestSchema } from '@/shared/schemas/backends/chatcompletions';

export const streamingRoutes = {
  chatStream: async (req: Request): Promise<Response> => {
    const body = await req.json();
    const parsed = ChatCompletionRequestSchema.parse(body);

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
  },
};
