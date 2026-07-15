import type { ProviderField } from "./ProviderForm";

// ── Types ──────────────────────────────────────────────────────────────

export type ProviderCategory = "textgen" | "chatcompletion" | "horde" | "novelai";

export interface ProviderConfig {
  /** Display name. */
  name: string;
  /** Backend category. */
  type: ProviderCategory;
  /** Dynamic field definitions. */
  fields: ProviderField[];
  /** Show a ModelSelector dropdown. */
  showModelSelector?: boolean;
  /** Show a URL input for self-hosted backends. */
  showUrl?: boolean;
  /** Placeholder text for the URL input. */
  urlPlaceholder?: string;
  /** Label for the connect button. */
  connectLabel?: string;
  /** Whether this source supports reverse proxy configuration. */
  supportsReverseProxy?: boolean;
}

// ── Reusable field factories ────────────────────────────────────────────

/** Standard API key field with optional registration link. */
function apiKeyField(
  registrationUrl?: string,
  placeholder = "sk-...",
): ProviderField {
  return {
    type: "password",
    key: "apiKey",
    label: "API Key",
    placeholder,
    link: registrationUrl
      ? { text: "Manage API Keys", url: registrationUrl }
      : undefined,
  };
}

/** Registration link helper. */
function registrationLink(url: string): { text: string; url: string } {
  return { text: "Get API Key", url };
}

// ─────────────────────────────────────────────────────────────────────────
// TEXT GENERATION PROVIDERS
// ─────────────────────────────────────────────────────────────────────────

export const TEXTGEN_PROVIDERS: Record<string, ProviderConfig> = {
  llamacpp: {
    name: "llama.cpp",
    type: "textgen",
    fields: [],
    showUrl: true,
    urlPlaceholder: "http://localhost:8080/v1",
    showModelSelector: true,
    connectLabel: "Connect",
  },

  ollama: {
    name: "Ollama",
    type: "textgen",
    fields: [],
    showUrl: true,
    urlPlaceholder: "http://localhost:11434",
    showModelSelector: true,
    connectLabel: "Connect",
  },

  tabby: {
    name: "TabbyAPI",
    type: "textgen",
    fields: [
      {
        type: "password",
        key: "apiKey",
        label: "API Key",
        placeholder: "Enter your Tabby API key (if authentication is enabled)",
        optional: true,
      },
    ],
    showUrl: true,
    urlPlaceholder: "http://localhost:5000",
    showModelSelector: true,
    connectLabel: "Connect",
  },

  koboldcpp: {
    name: "KoboldCpp",
    type: "textgen",
    fields: [],
    showUrl: true,
    urlPlaceholder: "http://localhost:5001",
    showModelSelector: true,
    connectLabel: "Connect",
  },

  vllm: {
    name: "vLLM",
    type: "textgen",
    fields: [
      {
        type: "password",
        key: "apiKey",
        label: "API Key",
        placeholder: "sk-...",
        optional: true,
        helpText: "Only required if --api-key was set on the vLLM server",
      },
    ],
    showUrl: true,
    urlPlaceholder: "http://localhost:8000/v1",
    showModelSelector: true,
    connectLabel: "Connect",
  },

  huggingface: {
    name: "HuggingFace",
    type: "textgen",
    fields: [
      apiKeyField("https://huggingface.co/settings/tokens", "hf_..."),
    ],
    showUrl: true,
    urlPlaceholder: "https://api-inference.huggingface.co/models/",
    showModelSelector: true,
    connectLabel: "Connect",
  },

  aphrodite: {
    name: "Aphrodite",
    type: "textgen",
    fields: [],
    showUrl: true,
    urlPlaceholder: "http://localhost:5000/v1",
    showModelSelector: true,
    connectLabel: "Connect",
  },

  dreamgen: {
    name: "DreamGen",
    type: "textgen",
    fields: [
      apiKeyField("https://dreamgen.com/app/settings/api", "dg_..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  mancer: {
    name: "Mancer",
    type: "textgen",
    fields: [
      apiKeyField("https://neuro.mancer.tech/profile/api-keys", "mn_..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  generic: {
    name: "Generic (OpenAI-compatible)",
    type: "textgen",
    fields: [
      {
        type: "password",
        key: "apiKey",
        label: "API Key",
        placeholder: "sk-...",
        optional: true,
        helpText: "Optional — leave blank if the server does not require auth",
      },
    ],
    showUrl: true,
    urlPlaceholder: "http://localhost:8080/v1",
    showModelSelector: true,
    connectLabel: "Connect",
  },

  ooba: {
    name: "Text Generation WebUI (oobabooga)",
    type: "textgen",
    fields: [],
    showUrl: true,
    urlPlaceholder: "http://localhost:5000",
    showModelSelector: true,
    connectLabel: "Connect",
  },

  featherless: {
    name: "Featherless",
    type: "textgen",
    fields: [
      apiKeyField("https://featherless.ai/account", "fl_..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  togetherai: {
    name: "TogetherAI",
    type: "textgen",
    fields: [
      apiKeyField("https://api.together.xyz/settings/api-keys", "to_..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  openrouter: {
    name: "OpenRouter",
    type: "textgen",
    fields: [
      apiKeyField("https://openrouter.ai/keys", "sk-or-..."),
      {
        type: "checkbox",
        key: "allowFallbacks",
        label: "Allow fallback models",
        defaultValue: true,
        helpText: "When enabled, requests may use alternative models if the primary is unavailable",
      },
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  infermaticai: {
    name: "InfermaticAI",
    type: "textgen",
    fields: [
      apiKeyField("https://infermaticai.com/settings/api-keys", "inf_..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },
};

// ─────────────────────────────────────────────────────────────────────────
// CHAT COMPLETION PROVIDERS
// ─────────────────────────────────────────────────────────────────────────

export const CHATCOMPLETION_PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    name: "OpenAI",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://platform.openai.com/api-keys", "sk-..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
    supportsReverseProxy: true,
  },

  claude: {
    name: "Claude",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://console.anthropic.com/settings/keys", "sk-ant-..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
    supportsReverseProxy: true,
  },

  openrouter: {
    name: "OpenRouter",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://openrouter.ai/keys", "sk-or-..."),
      {
        type: "checkbox",
        key: "allowFallbacks",
        label: "Allow fallback models",
        defaultValue: true,
        helpText: "When enabled, requests may use alternative models if the primary is unavailable",
      },
    ],
    showModelSelector: true,
    connectLabel: "Connect",
    supportsReverseProxy: true,
  },

  groq: {
    name: "Groq",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://console.groq.com/keys", "gsk_..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  makersuite: {
    name: "Google AI Studio",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://aistudio.google.com/app/apikey", "AIza..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
    supportsReverseProxy: true,
  },

  vertexai: {
    name: "Google Vertex AI",
    type: "chatcompletion",
    fields: [
      {
        type: "password",
        key: "apiKey",
        label: "Service Account JSON Key",
        placeholder: "Paste service account JSON...",
        helpText: "Google Cloud service account credentials with Vertex AI access",
      },
      {
        type: "text",
        key: "projectId",
        label: "Project ID",
        placeholder: "my-gcp-project",
      },
      {
        type: "text",
        key: "region",
        label: "Region",
        placeholder: "us-central1",
        defaultValue: "us-central1",
      },
    ],
    showModelSelector: true,
    connectLabel: "Connect",
    supportsReverseProxy: true,
  },

  mistralai: {
    name: "MistralAI",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://console.mistral.ai/api-keys/", "mist-..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
    supportsReverseProxy: true,
  },

  deepseek: {
    name: "DeepSeek",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://platform.deepseek.com/api_keys", "sk-..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
    supportsReverseProxy: true,
  },

  cohere: {
    name: "Cohere",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://dashboard.cohere.com/api-keys", "ck_..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  xai: {
    name: "xAI (Grok)",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://console.x.ai/team/default/api-keys", "xai-..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
    supportsReverseProxy: true,
  },

  azure_openai: {
    name: "Azure OpenAI",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://portal.azure.com", "az-..."),
      {
        type: "url",
        key: "endpoint",
        label: "Azure Endpoint",
        placeholder: "https://myinstance.openai.azure.com/",
      },
      {
        type: "text",
        key: "deploymentName",
        label: "Deployment Name",
        placeholder: "gpt-4o",
        helpText: "The name of your Azure OpenAI deployment",
      },
      {
        type: "text",
        key: "apiVersion",
        label: "API Version",
        placeholder: "2024-08-01-preview",
        defaultValue: "2024-08-01-preview",
      },
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  ai21: {
    name: "AI21",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://studio.ai21.com/account/api-key", "ai21-..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  aimlapi: {
    name: "AI/ML API",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://aimlapi.com/account/api-keys", "aiml-..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  fireworks: {
    name: "Fireworks AI",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://fireworks.ai/account/api-keys", "fw_..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  chutes: {
    name: "Chutes",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://chutes.ai/app/api-keys", "cpk_..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  electronhub: {
    name: "Electron Hub",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://electronhub.com/settings/api-keys", "eh_..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  nanogpt: {
    name: "NanoGPT",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://nanogpt.com/settings/api-keys", "ng_..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  cometapi: {
    name: "CometAPI",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://cometapi.com/settings/api-keys", "cmt_..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  moonshot: {
    name: "Moonshot AI",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://platform.moonshot.cn/console/api-keys", "sk-..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
    supportsReverseProxy: true,
  },

  zai: {
    name: "Z.AI (GLM)",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://open.bigmodel.cn/usercenter/apikeys", "zai-..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
    supportsReverseProxy: true,
  },

  siliconflow: {
    name: "SiliconFlow",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://cloud.siliconflow.cn/account/ak", "sk-..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  minimax: {
    name: "MiniMax",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://platform.minimaxi.com/console/api-keys", "mx_..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  perplexity: {
    name: "Perplexity",
    type: "chatcompletion",
    fields: [
      apiKeyField("https://www.perplexity.ai/settings/api", "pplx-..."),
    ],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  pollinations: {
    name: "Pollinations",
    type: "chatcompletion",
    fields: [],
    showModelSelector: true,
    connectLabel: "Connect",
  },

  custom: {
    name: "Custom (OpenAI-compatible)",
    type: "chatcompletion",
    fields: [
      {
        type: "password",
        key: "apiKey",
        label: "API Key",
        placeholder: "sk-...",
        optional: true,
        helpText: "Optional — leave blank if the server does not require auth",
      },
    ],
    showUrl: true,
    urlPlaceholder: "https://your-api.example.com/v1",
    showModelSelector: true,
    connectLabel: "Connect",
  },
};

// ─────────────────────────────────────────────────────────────────────────
// COMBINED LOOKUP
// ─────────────────────────────────────────────────────────────────────────

/** All providers merged — use `providers[source]` for a unified lookup. */
export const ALL_PROVIDERS: Record<string, ProviderConfig> = {
  ...TEXTGEN_PROVIDERS,
  ...CHATCOMPLETION_PROVIDERS,
};

/** Sources that support reverse proxy configuration. */
export const REVERSE_PROXY_SOURCES = new Set(
  Object.entries(ALL_PROVIDERS)
    .filter(([, cfg]) => cfg.supportsReverseProxy)
    .map(([id]) => id),
);

/** List all source ids for a given category. */
export function sourcesForCategory(category: ProviderCategory): string[] {
  const dict =
    category === "textgen" ? TEXTGEN_PROVIDERS : CHATCOMPLETION_PROVIDERS;
  return Object.keys(dict);
}
