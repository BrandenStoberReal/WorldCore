import type { ChatCompletionAdapter } from "./types"
import type { ChatCompletionRequest } from "@/shared/types/backends/chatcompletions"
import { convertCohereMessages } from "./prompt-converters"

export class CohereAdapter implements ChatCompletionAdapter {
  source = "cohere" as const

  async forwardRequest(req: ChatCompletionRequest): Promise<Response> {
    const url = (req.reverse_proxy as string | undefined) || "https://api.cohere.ai/v1/chat"

    const systemMessages = req.messages.filter(m => m.role === "system")
    const chatMessages = convertCohereMessages(req.messages.filter(m => m.role !== "system"))

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.getKey(req)}`,
      },
      body: JSON.stringify({
        model: req.model,
        message: chatMessages.length ? (chatMessages[chatMessages.length - 1]?.message || "") : "",
        chat_history: chatMessages.slice(0, -1),
        preamble: systemMessages.map(m => m.content).join("\n\n"),
        stream: req.stream,
        temperature: req.temperature,
        max_tokens: req.max_tokens,
        p: req.top_p,
        k: req.top_k,
        stop_sequences: Array.isArray(req.stop) ? req.stop : req.stop ? [req.stop] : undefined,
      }),
      signal: (req.signal as AbortSignal | undefined),
    })
  }

  private getKey(req: ChatCompletionRequest): string {
    return (req.api_key as string | undefined) || ""
  }
}
