import type { ChatCompletionMessage } from "@/shared/types/backends/chatcompletions"

type ContentPart = { text: string } | Record<string, unknown>

function extractText(content: string | Array<ContentPart>): string {
  if (typeof content === "string") return content
  return content
    .filter((c): c is { text: string } => "text" in c)
    .map(c => c.text)
    .join("\n")
}

export function convertClaudeMessages(messages: ChatCompletionMessage[]): {
  system: string
  messages: Array<{ role: string; content: string }>
} {
  const systemMessages = messages.filter(m => m.role === "system")
  const otherMessages = messages.filter(m => m.role !== "system")

  return {
    system: systemMessages.map(m => extractText(m.content)).join("\n\n"),
    messages: otherMessages.map(m => ({
      role: m.role === "assistant" ? "assistant" : m.role === "user" ? "user" : "assistant",
      content: extractText(m.content),
    })),
  }
}

export function convertGeminiMessages(messages: ChatCompletionMessage[]): {
  contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>
} {
  return {
    contents: messages.filter(m => m.role !== "system").map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: extractText(m.content) }],
    })),
  }
}

export function convertCohereMessages(messages: ChatCompletionMessage[]): Array<{
  role: string
  message: string
}> {
  return messages.filter(m => m.role !== "system").map(m => ({
    role: m.role,
    message: extractText(m.content),
  }))
}

export function convertMistralMessages(messages: ChatCompletionMessage[]): Array<{
  role: string
  content: string
}> {
  return messages.map(m => ({
    role: m.role,
    content: extractText(m.content),
  }))
}

export function convertXAIMessages(messages: ChatCompletionMessage[]): Array<{
  role: string
  content: string
}> {
  return convertMistralMessages(messages)
}
