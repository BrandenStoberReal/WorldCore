import { errorGuard } from '@/server/middleware/errorGuard';
import { generateHandler } from '@/server/backends/chat-completions';
import type { ChatCompletionRequest } from '@/shared/types/backends/chatcompletions';
import { ChatCompletionRequestSchema } from '@/shared/schemas/backends/chatcompletions';

export const chatCompletionsRoutes = {
  generate: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json();
    const parsed = ChatCompletionRequestSchema.parse(body);
    return generateHandler(parsed as ChatCompletionRequest);
  }),
};
