import type { ChatCompletionAdapter } from "./types"
import type { ChatCompletionRequest } from "@/shared/types/backends/chatcompletions"

function extractText(content: string | Array<{ text: string } | Record<string, unknown>>): string {
  if (typeof content === "string") return content
  return content
    .filter((c): c is { text: string } => "text" in c)
    .map(c => c.text)
    .join("\n")
}

export class OpenRouterAdapter implements ChatCompletionAdapter {
  source = "openrouter" as const

  async forwardRequest(req: ChatCompletionRequest): Promise<Response> {
    return fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.getKey(req)}`,
        "HTTP-Referer": "http://WorldCore.local",
        "X-Title": "WorldCore",
      },
      body: JSON.stringify({
        model: req.model,
        messages: req.messages.map(m => ({
          role: m.role,
          content: extractText(m.content),
        })),
        stream: req.stream,
        temperature: req.temperature,
        max_tokens: req.max_tokens,
        top_p: req.top_p,
      }),
      signal: (req.signal as AbortSignal | undefined),
    })
  }

  private getKey(req: ChatCompletionRequest): string {
    return (req.api_key as string | undefined) || ""
  }
}
