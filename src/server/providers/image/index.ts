import { generateStableDiffusion } from "./stableDiffusion"
import { generateComfy } from "./comfy"
import { secretManager } from "@/server/services/secrets.service"
import type { ImageProvider } from "@/shared/types/image"
import type { SecretKey } from "@/shared/types/secret"
import { ApiError } from "@/server/errors"

type GenerateOptions = {
  prompt: string;
  negativePrompt: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  sampler?: string;
  count?: number;
};

type ImageResult = { url: string; seed: number; metadata?: Record<string, unknown> };

async function buildUrl(
  secret: Awaited<ReturnType<typeof secretManager.read>>,
  fallback: string,
): Promise<string> {
  if (secret) {
    let url = secret.value.replace(/\/+$/, "");
    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }
    return url;
  }
  return fallback;
}

async function callOpenaiCompatibleImage(
  provider: string,
  apiKey: string,
  apiUrl: string,
  options: GenerateOptions,
): Promise<ImageResult[]> {
  const { prompt, negativePrompt, width = 512, height = 512, steps = 20, cfgScale = 7, seed, count = 1, model } = options;

  const body: Record<string, unknown> = {
    prompt,
    negative_prompt: negativePrompt || undefined,
    width,
    height,
    steps,
    cfg_scale: cfgScale,
    n: count,
  };

  if (model) body.model = model;
  if (seed !== undefined) body.seed = seed;

  const res = await fetch(`${apiUrl}/v1/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new ApiError("IMAGE_GEN_ERROR", `${provider} error ${res.status}: ${errText}`, 502);
  }

  const data = await res.json() as Record<string, unknown>;
  const images = (data.data as Array<Record<string, unknown>> | undefined) ?? [];
  const usedSeed = (data.seed as number | undefined) ?? 0;

  return images.map((img, i) => ({
    url: (img.url as string | undefined) ?? `data:image/png;base64,${img.b64_json as string}`,
    seed: usedSeed + i,
  }));
}

async function callFalAi(
  apiKey: string,
  options: GenerateOptions,
): Promise<ImageResult[]> {
  const { prompt, negativePrompt, width = 512, height = 512, steps = 20, cfgScale = 7, seed, count = 1, model = "stabilityai/stable-diffusion-xl" } = options;

  const requestBody: Record<string, unknown> = {
    prompt,
    width,
    height,
    num_inference_steps: steps,
    guidance_scale: cfgScale,
    num_images: count,
  };

  if (negativePrompt) requestBody.negative_prompt = negativePrompt;
  if (seed !== undefined) requestBody.seed = seed;

  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${apiKey}`,
      "X-Fal-Routing-Mode": "latency",
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new ApiError("IMAGE_GEN_ERROR", `fal.ai error ${res.status}: ${errText}`, 502);
  }

  const data = await res.json() as Record<string, unknown>;
  const images = (data.images as Array<Record<string, unknown>> | undefined) ?? [];
  const usedSeed = (data.seed as number | undefined) ?? 0;

  return images.map((img, i) => ({
    url: (img.url as string | undefined) ?? "",
    seed: usedSeed + i,
  }));
}

async function callPollinations(
  options: GenerateOptions,
): Promise<ImageResult[]> {
  const { prompt, negativePrompt, width = 512, height = 512, seed, count = 1 } = options;

  const results: ImageResult[] = [];
  for (let i = 0; i < count; i++) {
    const seedVal = seed ?? Math.floor(Math.random() * 999999);
    const params = new URLSearchParams({
      width: String(width),
      height: String(height),
      seed: String(seedVal + i),
      model: options.model ?? "flux",
    });
    if (negativePrompt) {
      params.set("negative_prompt", negativePrompt);
    }
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
    results.push({ url, seed: seedVal + i });
  }
  return results;
}

async function callStability(
  apiKey: string,
  options: GenerateOptions,
): Promise<ImageResult[]> {
  const { prompt, negativePrompt, width = 512, height = 512, steps = 30, cfgScale = 7, seed, count = 1, model = "stable-diffusion-xl-1024-v1-0" } = options;

  const formData = new FormData();
  formData.append("text_prompts", JSON.stringify([{ text: prompt, weight: 1 }, { text: negativePrompt, weight: -1 }].filter(p => p.text)));
  formData.append("width", String(width));
  formData.append("height", String(height));
  formData.append("steps", String(steps));
  formData.append("cfg_scale", String(cfgScale));
  formData.append("samples", String(count));
  if (seed !== undefined) {
    formData.append("seed", String(seed));
  }

  const res = await fetch(`https://api.stability.ai/v1/generation/${model}/text-to-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new ApiError("IMAGE_GEN_ERROR", `Stability error ${res.status}: ${errText}`, 502);
  }

  const data = await res.json() as Record<string, unknown>;
  const images = (data.artifacts as Array<Record<string, unknown>> | undefined) ?? [];
  const usedSeed = (data.seed as number | undefined) ?? 0;

  return images.map((img, i) => ({
    url: `data:image/png;base64,${img.base64 as string}`,
    seed: usedSeed + i,
  }));
}

async function callHuggingface(
  apiKey: string,
  options: GenerateOptions,
): Promise<ImageResult[]> {
  const { prompt, negativePrompt, width = 512, height = 512, steps = 30, cfgScale = 7, seed, count = 1, model = "stabilityai/stable-diffusion-xl-base-1.0" } = options;

  const body: Record<string, unknown> = {
    inputs: prompt,
    parameters: {
      negative_prompt: negativePrompt,
      width,
      height,
      num_inference_steps: steps,
      guidance_scale: cfgScale,
    },
  };
  if (seed !== undefined) {
    (body.parameters as Record<string, unknown>).seed = seed;
  }

  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new ApiError("IMAGE_GEN_ERROR", `HuggingFace error ${res.status}: ${errText}`, 502);
  }

  const blob = await res.arrayBuffer();
  const usedSeed = seed ?? Math.floor(Math.random() * 999999);
  const base64 = Buffer.from(blob).toString("base64");

  const results: ImageResult[] = [];
  for (let i = 0; i < count; i++) {
    results.push({
      url: `data:image/png;base64,${base64}`,
      seed: usedSeed + i,
    });
  }
  return results;
}

export async function generateImage(
  provider: ImageProvider,
  options: GenerateOptions,
): Promise<ImageResult[]> {
  switch (provider) {
    case "stableDiffusion": {
      const secret = await secretManager.read("stable_diffusion_url" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "stable_diffusion_url not configured", 500);
      const url = await buildUrl(secret, "http://127.0.0.1:7860");
      return generateStableDiffusion(options.prompt, options.negativePrompt, url, options);
    }
    case "comfy": {
      const secret = await secretManager.read("comfy_url" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "comfy_url not configured", 500);
      const url = await buildUrl(secret, "http://127.0.0.1:8188");
      return generateComfy(options.prompt, options.negativePrompt, url, options);
    }
    case "comfyrunpod": {
      const secret = await secretManager.read("comfyrunpod_key" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "comfyrunpod_key not configured", 500);
      return callOpenaiCompatibleImage("comfyrunpod", secret.value, "https://rs6743vf6cfcujdk.us-east-1.aws.replicate.runpod.net", options);
    }
    case "together": {
      const secret = await secretManager.read("together_key" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "together_key not configured", 500);
      return callOpenaiCompatibleImage("together", secret.value, "https://api.together.xyz", options);
    }
    case "sdcpp": {
      const secret = await secretManager.read("sdcpp_url" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "sdcpp_url not configured", 500);
      const url = await buildUrl(secret, "http://127.0.0.1:18888");
      return generateStableDiffusion(options.prompt, options.negativePrompt, url, options);
    }
    case "drawthings": {
      const secret = await secretManager.read("drawthings_url" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "drawthings_url not configured", 500);
      const url = await buildUrl(secret, "http://127.0.0.1:18188");
      return generateStableDiffusion(options.prompt, options.negativePrompt, url, options);
    }
    case "pollinations":
      return callPollinations(options);
    case "stability": {
      const secret = await secretManager.read("stability_key" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "stability_key not configured", 500);
      return callStability(secret.value, options);
    }
    case "huggingface": {
      const secret = await secretManager.read("huggingface_key" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "huggingface_key not configured", 500);
      return callHuggingface(secret.value, options);
    }
    case "chutes": {
      const secret = await secretManager.read("chutes_key" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "chutes_key not configured", 500);
      return callOpenaiCompatibleImage("chutes", secret.value, "https://api.chutes.ai", options);
    }
    case "electronhub": {
      const secret = await secretManager.read("electronhub_key" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "electronhub_key not configured", 500);
      return callOpenaiCompatibleImage("electronhub", secret.value, "https://api.electronhub.org", options);
    }
    case "nanogpt": {
      const secret = await secretManager.read("nanogpt_key" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "nanogpt_key not configured", 500);
      return callOpenaiCompatibleImage("nanogpt", secret.value, "https://api.nanogpt.net", options);
    }
    case "bfl": {
      const secret = await secretManager.read("bfl_key" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "bfl_key not configured", 500);
      return callOpenaiCompatibleImage("bfl", secret.value, "https://api.bfl.ml", options);
    }
    case "falai": {
      const secret = await secretManager.read("falai_key" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "falai_key not configured", 500);
      return callFalAi(secret.value, options);
    }
    case "xai": {
      const secret = await secretManager.read("xai_key" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "xai_key not configured", 500);
      return callOpenaiCompatibleImage("xai", secret.value, "https://api.x.ai/v1", options);
    }
    case "aimlapi": {
      const secret = await secretManager.read("aimlapi_key" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "aimlapi_key not configured", 500);
      return callOpenaiCompatibleImage("aimlapi", secret.value, "https://api.aimlapi.com", options);
    }
    case "zai": {
      const secret = await secretManager.read("zai_key" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "zai_key not configured", 500);
      return callOpenaiCompatibleImage("zai", secret.value, "https://api.lmsyzai.com", options);
    }
    case "workersai": {
      const secret = await secretManager.read("workersai_key" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "workersai_key not configured", 500);
      return callOpenaiCompatibleImage("workersai", secret.value, "https://workersai.api.com", options);
    }
    default:
      throw new ApiError("UNKNOWN_PROVIDER", `Unknown image provider: ${provider}`, 400);
  }
}
