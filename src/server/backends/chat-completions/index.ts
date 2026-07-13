import type { ChatCompletionSource, ChatCompletionRequest } from "@/shared/types/backends/chatcompletions"
import type { ChatCompletionAdapter } from "./types"

const adapters = new Map<ChatCompletionSource, ChatCompletionAdapter>()

export async function dispatcher(source: ChatCompletionSource): Promise<ChatCompletionAdapter> {
  if (adapters.has(source)) {
    return adapters.get(source)!
  }

  let adapter: ChatCompletionAdapter | null = null

  switch (source) {
    case "openai":
    case "openai_legacy":
      { const mod = await import("./openai.adapter"); adapter = new mod.OpenAIAdapter(source); break }
    case "claude":
      { const mod = await import("./claude.adapter"); adapter = new mod.ClaudeAdapter(); break }
    case "makersuite":
    case "vertexai":
      { const mod = await import("./gemini.adapter"); adapter = new mod.GeminiAdapter(source); break }
    case "cohere":
      { const mod = await import("./cohere.adapter"); adapter = new mod.CohereAdapter(); break }
    case "ai21":
      { const mod = await import("./ai21.adapter"); adapter = new mod.AI21Adapter(); break }
    case "xai":
      { const mod = await import("./xai.adapter"); adapter = new mod.XAIAdapter(); break }
    case "azure_openai":
      { const mod = await import("./azure.adapter"); adapter = new mod.AzureOpenAIAdapter(); break }
    case "openrouter":
      { const mod = await import("./openrouter.adapter"); adapter = new mod.OpenRouterAdapter(); break }
    case "ollama":
      { const mod = await import("./ollama.adapter"); adapter = new mod.OllamaAdapter(); break }
    case "groq":
      { const mod = await import("./groq.adapter"); adapter = new mod.GroqAdapter(); break }
    case "koboldcpp":
      { const mod = await import("./koboldcpp.adapter"); adapter = new mod.KoboldCppAdapter(); break }
    case "mistralai":
      { const mod = await import("./mistralai.adapter"); adapter = new mod.MistralAIAdapter(); break }
    case "deepseek":
      { const mod = await import("./deepseek.adapter"); adapter = new mod.DeepSeekAdapter(); break }
    case "aimlapi":
      { const mod = await import("./aimlapi.adapter"); adapter = new mod.AimlapiAdapter(); break }
    case "fireworks":
      { const mod = await import("./fireworks.adapter"); adapter = new mod.FireworksAdapter(); break }
    case "chutes":
      { const mod = await import("./chutes.adapter"); adapter = new mod.ChutesAdapter(); break }
    case "electronhub":
      { const mod = await import("./electronhub.adapter"); adapter = new mod.ElectronhubAdapter(); break }
    case "nanogpt":
      { const mod = await import("./nanogpt.adapter"); adapter = new mod.NanogptAdapter(); break }
    case "cometapi":
      { const mod = await import("./cometapi.adapter"); adapter = new mod.CometapiAdapter(); break }
    case "moonshot":
      { const mod = await import("./moonshot.adapter"); adapter = new mod.MoonshotAdapter(); break }
    case "zai":
      { const mod = await import("./zai.adapter"); adapter = new mod.ZaiAdapter(); break }
    case "siliconflow":
      { const mod = await import("./siliconflow.adapter"); adapter = new mod.SiliconflowAdapter(); break }
    case "minimax":
      { const mod = await import("./minimax.adapter"); adapter = new mod.MinimaxAdapter(); break }
    default:
      { const mod = await import("./generic.adapter"); adapter = new mod.GenericAdapter(source); break }
  }

  if (adapter) {
    adapters.set(source, adapter)
    return adapter
  }

  throw new Error(`No adapter for source: ${source}`)
}

export async function generateHandler(req: ChatCompletionRequest): Promise<Response> {
  const adapter = await dispatcher(req.chat_completion_source)
  return adapter.forwardRequest(req)
}
