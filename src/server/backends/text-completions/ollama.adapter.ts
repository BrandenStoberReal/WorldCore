import type { TextCompletionAdapter } from "./types"
import type { TextCompletionRequest } from "@/shared/types/backends/textcompletions"

export class OllamaAdapter implements TextCompletionAdapter {
  source = "ollama" as const

  async forwardRequest(req: TextCompletionRequest): Promise<Response> {
    const url = (req.reverse_proxy as string | undefined) || "http://127.0.0.1:11434"

    return fetch(`${url}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.getKey(req)}`,
      },
      body: JSON.stringify({
        model: req.model,
        prompt: req.prompt,
        stream: false,
        options: {
          temperature: req.temperature,
          top_p: req.top_p,
          num_predict: req.max_length,
        },
      }),
      signal: (req.signal as AbortSignal | undefined),
    })
  }

  private getKey(req: TextCompletionRequest): string {
    return (req.api_key as string | undefined) || ""
  }
}
