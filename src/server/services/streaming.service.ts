import type { ChatCompletionRequest } from "@/shared/types/backends/chatcompletions"

export interface StreamingAdapter {
  createStream(req: ChatCompletionRequest): Promise<ReadableStream<Uint8Array>>
  abort(): void
}

export class StreamingController {
  private abortController: AbortController | null = null

  async createStream(
    req: ChatCompletionRequest,
    adapter: StreamingAdapter,
  ): Promise<Response> {
    this.abortController = new AbortController()
    const signal = this.abortController.signal
    ;(req as Record<string, unknown>).signal = signal

    const stream = await adapter.createStream(req)

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  }

  abort(): void {
    this.abortController?.abort()
    this.abortController = null
  }
}

export function encodeSSE(data: string): string {
  return `data: ${data}\n\n`
}

export function encodeDone(): string {
  return "data: [DONE]\n\n"
}

export function passthroughSSE(response: Response): ReadableStream<Uint8Array> {
  if (!response.body) {
    throw new Error("Response has no body")
  }
  return response.body
}

export async function* ollamaNDJSONToSSE(response: Response): AsyncGenerator<string> {
  if (!response.body) {
    throw new Error("Response has no body")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split("\n")

      for (const line of lines) {
        if (!line.trim()) continue

        try {
          const parsed = JSON.parse(line)

          if (parsed.done) {
            yield encodeDone()
            continue
          }

          const content = parsed.message?.content || ""
          const delta = JSON.stringify({ content })
          yield encodeSSE(JSON.stringify({ choices: [{ delta }] }))
        } catch {
          yield encodeSSE(line)
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export async function ollamaStreamToReadable(response: Response): Promise<ReadableStream<Uint8Array>> {
  const generator = ollamaNDJSONToSSE(response)
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await generator.next()
      if (done) {
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(value))
    },
    cancel() {
      generator.return(undefined)
    },
  })
}
