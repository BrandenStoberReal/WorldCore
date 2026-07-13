import type { ChatCompletionAdapter } from "./types"
import type { ChatCompletionRequest, ChatCompletionSource } from "@/shared/types/backends/chatcompletions"
import { convertGeminiMessages } from "./prompt-converters"

export class GeminiAdapter implements ChatCompletionAdapter {
  source: ChatCompletionSource

  constructor(source: ChatCompletionSource) {
    this.source = source
  }

  async forwardRequest(req: ChatCompletionRequest): Promise<Response> {
    const { contents } = convertGeminiMessages(req.messages)
    const baseUrl = this.source === "vertexai"
      ? "https://us-central1-aiplatform.googleapis.com/v1"
      : "https://generativelanguage.googleapis.com/v1beta"

    return fetch(`${baseUrl}/models/${req.model}:streamGenerateContent?key=${this.getKey(req)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: req.temperature,
          maxOutputTokens: req.max_tokens,
          topP: req.top_p,
        },
      }),
      signal: (req.signal as AbortSignal | undefined),
    })
  }

  private getKey(req: ChatCompletionRequest): string {
    return (req.api_key as string | undefined) || ""
  }
}
