import { errorGuard } from "@/server/middleware/errorGuard"
import { generateHandler } from "@/server/backends/chat-completions"
import type { ChatCompletionRequest } from "@/shared/types/backends/chatcompletions"

export const chatCompletionsRoutes = {
  generate: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json()
    return generateHandler(body as ChatCompletionRequest)
  }),
}
