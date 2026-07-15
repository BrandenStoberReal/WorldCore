import type {
  TextCompletionSource,
  TextCompletionRequest,
} from '@/shared/types/backends/textcompletions';
import type { TextCompletionAdapter } from './types';

const adapters = new Map<TextCompletionSource, TextCompletionAdapter>();

export async function dispatcher(source: TextCompletionSource): Promise<TextCompletionAdapter> {
  if (adapters.has(source)) {
    return adapters.get(source)!;
  }

  let adapter: TextCompletionAdapter | null = null;

  switch (source) {
    case 'kobold': {
      const mod = await import('./kobold.adapter');
      adapter = new mod.KoboldAdapter();
      break;
    }
    case 'textgenerationwebui': {
      const mod = await import('./textgenerationwebui.adapter');
      adapter = new mod.TextGenerationWebUIAdapter();
      break;
    }
    case 'ooba': {
      const mod = await import('./ooba.adapter');
      adapter = new mod.OobaAdapter();
      break;
    }
    case 'aphrodite': {
      const mod = await import('./aphrodite.adapter');
      adapter = new mod.AphroditeAdapter();
      break;
    }
    case 'llamacpp': {
      const mod = await import('./llamacpp.adapter');
      adapter = new mod.LlamaCppAdapter();
      break;
    }
    case 'ollama': {
      const mod = await import('./ollama.adapter');
      adapter = new mod.OllamaAdapter();
      break;
    }
    case 'tabby': {
      const mod = await import('./tabby.adapter');
      adapter = new mod.TabbyAdapter();
      break;
    }
    case 'mancer': {
      const mod = await import('./mancer.adapter');
      adapter = new mod.MancerAdapter();
      break;
    }
    case 'vllm': {
      const mod = await import('./vllm.adapter');
      adapter = new mod.VllmAdapter();
      break;
    }
    case 'openrouter': {
      const mod = await import('./openrouter.adapter');
      adapter = new mod.OpenRouterAdapter();
      break;
    }
    case 'featherless': {
      const mod = await import('./featherless.adapter');
      adapter = new mod.FeatherlessAdapter();
      break;
    }
    case 'huggingface': {
      const mod = await import('./huggingface.adapter');
      adapter = new mod.HuggingFaceAdapter();
      break;
    }
    case 'dreamgen': {
      const mod = await import('./dreamgen.adapter');
      adapter = new mod.DreamGenAdapter();
      break;
    }
    case 'togetherai': {
      const mod = await import('./togetherai.adapter');
      adapter = new mod.TogetherAIAdapter();
      break;
    }
    case 'infermaticai': {
      const mod = await import('./infermaticai.adapter');
      adapter = new mod.InfermaticAIAdapter();
      break;
    }
    default: {
      const mod = await import('./generic.adapter');
      adapter = new mod.GenericAdapter(source);
      break;
    }
  }

  if (adapter) {
    adapters.set(source, adapter);
    return adapter;
  }

  throw new Error(`No adapter for source: ${source}`);
}

export async function generateHandler(req: TextCompletionRequest): Promise<Response> {
  const adapter = await dispatcher(req.text_completion_source);
  return adapter.forwardRequest(req);
}
