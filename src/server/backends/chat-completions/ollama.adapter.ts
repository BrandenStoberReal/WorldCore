import type { ChatCompletionAdapter } from "./types"
import type { ChatCompletionRequest } from "@/shared/types/backends/chatcompletions"

function extractText(content: string | Array<{ text: string } | Record<string, unknown>>): string {
  if (typeof content === "string") return content
  return content
    .filter((c): c is { text: string } => "text" in c)
    .map(c => c.text)
    .join("\n")
}

export class OllamaAdapter implements ChatCompletionAdapter {
  source = "ollama" as const

  async forwardRequest(req: ChatCompletionRequest): Promise<Response> {
    const url = (req.reverse_proxy as string | undefined) || "http://127.0.0.1:11434"

    return fetch(`${url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: req.model,
        messages: req.messages.map(m => ({
          role: m.role,
          content: extractText(m.content),
        })),
        stream: req.stream,
        options: {
          temperature: req.temperature,
          num_predict: req.max_tokens,
          top_p: req.top_p,
        },
      }),
      signal: (req.signal as AbortSignal | undefined),
    })
  }
}
