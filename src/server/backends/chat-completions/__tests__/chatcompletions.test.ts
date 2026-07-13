import { describe, it, expect } from "bun:test"
import { dispatcher } from "@/server/backends/chat-completions"
import {
  convertClaudeMessages,
  convertGeminiMessages,
  convertCohereMessages,
  convertMistralMessages,
  convertXAIMessages,
} from "@/server/backends/chat-completions/prompt-converters"
import type { ChatCompletionMessage } from "@/shared/types/backends/chatcompletions"

describe("ChatCompletion dispatcher", () => {
  it("resolves openai adapter", async () => {
    const adapter = await dispatcher("openai")
    expect(adapter.source).toBe("openai")
    expect(typeof adapter.forwardRequest).toBe("function")
  })

  it("resolves openai_legacy adapter", async () => {
    const adapter = await dispatcher("openai_legacy")
    expect(adapter.source).toBe("openai_legacy")
  })

  it("resolves claude adapter", async () => {
    const adapter = await dispatcher("claude")
    expect(adapter.source).toBe("claude")
  })

  it("resolves makersuite adapter", async () => {
    const adapter = await dispatcher("makersuite")
    expect(adapter.source).toBe("makersuite")
  })

  it("resolves vertexai adapter", async () => {
    const adapter = await dispatcher("vertexai")
    expect(adapter.source).toBe("vertexai")
  })

  it("resolves openrouter adapter", async () => {
    const adapter = await dispatcher("openrouter")
    expect(adapter.source).toBe("openrouter")
  })

  it("resolves ollama adapter", async () => {
    const adapter = await dispatcher("ollama")
    expect(adapter.source).toBe("ollama")
  })

  it("resolves groq adapter", async () => {
    const adapter = await dispatcher("groq")
    expect(adapter.source).toBe("groq")
  })

  it("resolves koboldcpp adapter", async () => {
    const adapter = await dispatcher("koboldcpp")
    expect(adapter.source).toBe("koboldcpp")
  })

  it("resolves mistralai adapter", async () => {
    const adapter = await dispatcher("mistralai")
    expect(adapter.source).toBe("mistralai")
  })

  it("resolves deepseek adapter", async () => {
    const adapter = await dispatcher("deepseek")
    expect(adapter.source).toBe("deepseek")
  })

  it("resolves aimlapi adapter", async () => {
    const adapter = await dispatcher("aimlapi")
    expect(adapter.source).toBe("aimlapi")
  })

  it("resolves fireworks adapter", async () => {
    const adapter = await dispatcher("fireworks")
    expect(adapter.source).toBe("fireworks")
  })

  it("resolves chutes adapter", async () => {
    const adapter = await dispatcher("chutes")
    expect(adapter.source).toBe("chutes")
  })

  it("resolves electronhub adapter", async () => {
    const adapter = await dispatcher("electronhub")
    expect(adapter.source).toBe("electronhub")
  })

  it("resolves nanogpt adapter", async () => {
    const adapter = await dispatcher("nanogpt")
    expect(adapter.source).toBe("nanogpt")
  })

  it("resolves cometapi adapter", async () => {
    const adapter = await dispatcher("cometapi")
    expect(adapter.source).toBe("cometapi")
  })

  it("resolves moonshot adapter", async () => {
    const adapter = await dispatcher("moonshot")
    expect(adapter.source).toBe("moonshot")
  })

  it("resolves zai adapter", async () => {
    const adapter = await dispatcher("zai")
    expect(adapter.source).toBe("zai")
  })

  it("resolves siliconflow adapter", async () => {
    const adapter = await dispatcher("siliconflow")
    expect(adapter.source).toBe("siliconflow")
  })

  it("resolves minimax adapter", async () => {
    const adapter = await dispatcher("minimax")
    expect(adapter.source).toBe("minimax")
  })

  it("caches adapter instances", async () => {
    const a1 = await dispatcher("openai")
    const a2 = await dispatcher("openai")
    expect(a1).toBe(a2)
  })
})

describe("Claude prompt converter", () => {
  const messages: ChatCompletionMessage[] = [
    { role: "system", content: "Be helpful." },
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" },
  ]

  it("extracts system message", () => {
    const result = convertClaudeMessages(messages)
    expect(result.system).toBe("Be helpful.")
  })

  it("filters system from messages array", () => {
    const result = convertClaudeMessages(messages)
    expect(result.messages.length).toBe(2)
  })

  it("preserves user and assistant roles", () => {
    const result = convertClaudeMessages(messages)
    const first = result.messages[0]
    const second = result.messages[1]
    expect(first?.role).toBe("user")
    expect(second?.role).toBe("assistant")
  })

  it("joins multiple system messages", () => {
    const multiSystem: ChatCompletionMessage[] = [
      { role: "system", content: "Rule 1." },
      { role: "system", content: "Rule 2." },
      { role: "user", content: "Go" },
    ]
    const result = convertClaudeMessages(multiSystem)
    expect(result.system).toBe("Rule 1.\n\nRule 2.")
  })
})

describe("Gemini prompt converter", () => {
  const messages: ChatCompletionMessage[] = [
    { role: "system", content: "Be helpful." },
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" },
  ]

  it("filters system messages", () => {
    const result = convertGeminiMessages(messages)
    expect(result.contents.length).toBe(2)
  })

  it("maps assistant to model role", () => {
    const result = convertGeminiMessages(messages)
    expect(result.contents[0]?.role).toBe("user")
    expect(result.contents[1]?.role).toBe("model")
  })

  it("wraps content in parts", () => {
    const result = convertGeminiMessages(messages)
    expect(result.contents[0]?.parts[0]?.text).toBe("Hello")
  })
})

describe("Cohere prompt converter", () => {
  const messages: ChatCompletionMessage[] = [
    { role: "system", content: "Be helpful." },
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi!" },
  ]

  it("filters system messages", () => {
    const result = convertCohereMessages(messages)
    expect(result.length).toBe(2)
  })

  it("maps content to message field", () => {
    const result = convertCohereMessages(messages)
    expect(result[0]?.message).toBe("Hello")
  })
})

describe("Mistral prompt converter", () => {
  const messages: ChatCompletionMessage[] = [
    { role: "system", content: "Be helpful." },
    { role: "user", content: "Hello" },
  ]

  it("preserves all messages including system", () => {
    const result = convertMistralMessages(messages)
    expect(result.length).toBe(2)
  })

  it("preserves content field name", () => {
    const result = convertMistralMessages(messages)
    expect(result[0]?.content).toBe("Be helpful.")
  })
})

describe("xAI prompt converter", () => {
  it("delegates to Mistral converter", () => {
    const messages: ChatCompletionMessage[] = [
      { role: "user", content: "Hi" },
    ]
    const result = convertXAIMessages(messages)
    expect(result[0]?.content).toBe("Hi")
  })
})
