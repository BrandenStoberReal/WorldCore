import { errorGuard } from '@/server/middleware/errorGuard';
import { generateHandler } from '@/server/backends/text-completions';
import type { TextCompletionRequest } from '@/shared/types/backends/textcompletions';

export const textCompletionsRoutes = {
  generate: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json();
    return generateHandler(body as TextCompletionRequest);
  }),
};
