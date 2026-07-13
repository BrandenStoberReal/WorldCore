import { errorGuard } from "@/server/middleware/errorGuard"
import {
  TTSSynthesizeRequestSchema,
  TTSSynthesizeResponseSchema,
  STTTranscribeRequestSchema,
  STTTranscribeResponseSchema,
} from "@/shared/schemas/speech"
import { synthesizeTTS } from "@/server/providers/tts"
import { ValidationError, ApiError } from "@/server/errors"

export const speechRoutes = {
  synthesize: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as Record<string, unknown>
    const parsed = TTSSynthesizeRequestSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors)
    }

    const result = await synthesizeTTS(parsed.data.provider, {
      text: parsed.data.text,
      voice: parsed.data.voice,
      model: parsed.data.model,
      speed: parsed.data.speed,
    })

    const response = TTSSynthesizeResponseSchema.parse({
      audioBase64: result.audioBase64,
      provider: parsed.data.provider,
      voice: parsed.data.voice,
      duration: result.duration,
    })

    return Response.json(response)
  }),

  transcribe: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as Record<string, unknown>
    const parsed = STTTranscribeRequestSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors)
    }

    const result = await transcribeSTT(parsed.data.provider, {
      audioBase64: parsed.data.audioBase64,
      model: parsed.data.model,
      language: parsed.data.language,
    })

    const response = STTTranscribeResponseSchema.parse({
      text: result.text,
      provider: parsed.data.provider,
      language: result.language,
      duration: result.duration,
      words: result.words,
    })

    return Response.json(response)
  }),
}

type STTTranscribeOptions = {
  audioBase64: string;
  model?: string;
  language?: string;
};

type STTResult = {
  text: string;
  language?: string;
  duration?: number;
  words?: Array<{ word: string; start: number; end: number }>;
};

import { secretManager } from "@/server/services/secrets.service"
import type { STTProvider } from "@/shared/types/speech"
import type { SecretKey } from "@/shared/types/secret"

async function transcribeSTT(
  provider: STTProvider,
  options: STTTranscribeOptions,
): Promise<STTResult> {
  switch (provider) {
    case "openai": {
      const secret = await secretManager.read("openai_key" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "openai_key not configured", 500);
      return transcribeOpenAI(options.audioBase64, secret.value, options);
    }
    case "whispercpp": {
      const secret = await secretManager.read("llamacpp_url" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "llamacpp_url not configured for whisper.cpp", 500);
      let url = secret.value.replace(/\/+$/, "");
      if (!url.startsWith("http")) {
        url = `https://${url}`;
      }
      return transcribeWhisperCPP(options.audioBase64, url, options);
    }
    case "custom": {
      const secret = await secretManager.read("openai_key" as SecretKey);
      if (!secret) throw new ApiError("MISSING_SECRET", "custom STT key not configured", 500);
      return transcribeOpenAI(options.audioBase64, secret.value, options);
    }
    default:
      throw new ApiError("UNKNOWN_PROVIDER", `Unknown STT provider: ${provider}`, 400);
  }
}

async function transcribeOpenAI(
  audioBase64: string,
  apiKey: string,
  options: STTTranscribeOptions,
): Promise<STTResult> {
  const { model = "whisper-1", language } = options;

  const audioBuffer = Buffer.from(audioBase64, "base64");
  const formData = new FormData();
  formData.append("file", new Blob([audioBuffer], { type: "audio/mpeg" }), "audio.mp3");
  formData.append("model", model);
  if (language) {
    formData.append("language", language);
  }

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI STT error ${res.status}: ${errText}`);
  }

  const data = await res.json() as Record<string, unknown>;
  return {
    text: (data.text as string) ?? "",
    language: (data.language as string | undefined) ?? language,
  };
}

async function transcribeWhisperCPP(
  audioBase64: string,
  apiUrl: string,
  options: STTTranscribeOptions,
): Promise<STTResult> {
  const { model, language } = options;

  const body: Record<string, unknown> = {
    audio_base64: audioBase64,
  };
  if (model) body.model = model;
  if (language) body.language = language;

  const res = await fetch(`${apiUrl}/v1/audio/transcriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Whisper.cpp STT error ${res.status}: ${errText}`);
  }

  const data = await res.json() as Record<string, unknown>;
  return {
    text: (data.text as string) ?? "",
    language: (data.language as string | undefined) ?? language,
  };
}
