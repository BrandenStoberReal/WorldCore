import { errorGuard } from '@/server/middleware/errorGuard';
import { generateHandler } from '@/server/backends/text-completions';
import type { TextCompletionRequest } from '@/shared/types/backends/textcompletions';
import { TextCompletionRequestSchema } from '@/shared/schemas/backends/textcompletions';

export const textCompletionsRoutes = {
  generate: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json();
    const parsed = TextCompletionRequestSchema.parse(body);
    return generateHandler(parsed as TextCompletionRequest);
  }),
};
