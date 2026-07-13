import type { ChatCompletionAdapter } from "./types"
import type { ChatCompletionRequest } from "@/shared/types/backends/chatcompletions"

function buildPrompt(messages: ChatCompletionRequest["messages"]): string {
  return messages.map(m => `${m.role}: ${m.content}`).join("\n\n")
}

export class KoboldCppAdapter implements ChatCompletionAdapter {
  source = "koboldcpp" as const

  async forwardRequest(req: ChatCompletionRequest): Promise<Response> {
    const url = (req.reverse_proxy as string | undefined) || "http://127.0.0.1:5001"

    const body: Record<string, unknown> = {
      prompt: buildPrompt(req.messages),
      max_context_length: req.max_tokens,
      max_length: req.max_tokens,
      temperature: req.temperature,
      top_p: req.top_p,
      top_k: req.top_k,
      stop_sequences: req.stop,
      seed: req.seed,
    }

    return fetch(`${url}/api/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.getKey(req)}`,
      },
      body: JSON.stringify(body),
      signal: (req.signal as AbortSignal | undefined),
    })
  }

  private getKey(req: ChatCompletionRequest): string {
    return (req.api_key as string | undefined) || ""
  }
}
