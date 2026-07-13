import type { ChatCompletionAdapter } from "./types"
import type { ChatCompletionRequest } from "@/shared/types/backends/chatcompletions"

export class AzureOpenAIAdapter implements ChatCompletionAdapter {
  source = "azure_openai" as const

  async forwardRequest(req: ChatCompletionRequest): Promise<Response> {
    const baseUrl = (req.reverse_proxy as string | undefined) || ""
    const deployment = req.model || "gpt-35-turbo"
    const url = `${baseUrl}/openai/deployments/${deployment}/chat/completions?api-version=2023-03-15-preview`

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": this.getKey(req),
      },
      body: JSON.stringify({
        model: req.model,
        messages: req.messages,
        stream: req.stream,
        temperature: req.temperature,
        max_tokens: req.max_tokens,
        frequency_penalty: req.frequency_penalty,
        presence_penalty: req.presence_penalty,
        top_p: req.top_p,
        stop: req.stop,
      }),
      signal: (req.signal as AbortSignal | undefined),
    })
  }

  private getKey(req: ChatCompletionRequest): string {
    return (req.api_key as string | undefined) || ""
  }
}
