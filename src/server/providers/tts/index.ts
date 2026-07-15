import { synthesizeOpenAI } from './openai';
import { synthesizeAzure } from './azure';
import { synthesizeElevenLabs } from './elevenlabs';
import { secretManager } from '@/server/services/secrets.service';
import type { TTSProvider } from '@/shared/types/speech';
import type { SecretKey } from '@/shared/types/secret';
import { ApiError } from '@/server/errors';

type TTSSynthesizeOptions = {
  text: string;
  voice?: string;
  model?: string;
  speed?: number;
};

type TTSResult = { audioBase64: string; duration?: number };

export async function synthesizeTTS(
  provider: TTSProvider,
  options: TTSSynthesizeOptions,
): Promise<TTSResult> {
  switch (provider) {
    case 'openai': {
      const secret = await secretManager.read('openai_key' as SecretKey);
      if (!secret) throw new ApiError('MISSING_SECRET', 'openai_key not configured', 500);
      return synthesizeOpenAI(options.text, secret.value, options);
    }
    case 'azure': {
      const secret = await secretManager.read('azure_openai_key' as SecretKey);
      if (!secret) throw new ApiError('MISSING_SECRET', 'azure_openai_key not configured', 500);
      return synthesizeAzure(options.text, secret.value, options);
    }
    case 'elevenlabs': {
      const secret = await secretManager.read('elevenlabs_key' as SecretKey);
      if (!secret) throw new ApiError('MISSING_SECRET', 'elevenlabs_key not configured', 500);
      return synthesizeElevenLabs(options.text, secret.value, options);
    }
    case 'edge':
      return synthesizeEdge(options.text, options);
    case 'coqui': {
      const secret = await secretManager.read('openai_key' as SecretKey);
      if (!secret) throw new ApiError('MISSING_SECRET', 'openai_key not configured for coqui', 500);
      return synthesizeOpenAI(options.text, secret.value, {
        ...options,
        model: options.model ?? 'tts-1',
      });
    }
    case 'bark': {
      const secret = await secretManager.read('huggingface_key' as SecretKey);
      if (!secret)
        throw new ApiError('MISSING_SECRET', 'huggingface_key not configured for bark', 500);
      return synthesizeBark(options.text, secret.value, options);
    }
    case 'custom': {
      const secret = await secretManager.read('openai_key' as SecretKey);
      if (!secret) throw new ApiError('MISSING_SECRET', 'custom TTS key not configured', 500);
      return synthesizeOpenAI(options.text, secret.value, options);
    }
    case 'silero': {
      const secret = await secretManager.read('huggingface_key' as SecretKey);
      if (!secret)
        throw new ApiError('MISSING_SECRET', 'huggingface_key not configured for silero', 500);
      return synthesizeSilero(options.text, secret.value, options);
    }
    default:
      throw new ApiError('UNKNOWN_PROVIDER', `Unknown TTS provider: ${provider}`, 400);
  }
}

async function synthesizeEdge(text: string, options: TTSSynthesizeOptions): Promise<TTSResult> {
  const { voice = 'en-US-AriaNeural' } = options;

  const ssml = `<?xml version="1.0" encoding="utf-8"?>
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
  <voice name="${voice}">${text}</voice>
</speak>`;

  const boundary = `boundary${Date.now()}`;
  const configPath = 'Path';
  const pathBody = `X-RequestId:${Date.now()}\r\nX-Target:SSML\r\nContent-Type:application/ssml+xml\r\nX-UserAgent:my-app/1.0.0\r\n\r\n${ssml}\r\n`;

  const configRes = await fetch('https://dev.microsofttranslator.com/apps/locate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'Set-Locale=zh-Hans',
  });

  const configData = (await configRes.json()) as Record<string, unknown>;
  const ttsUrl =
    (configData['TTSUrl'] as string | undefined) ??
    'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';

  const res = await fetch(`${ttsUrl}?TrustedClientToken=6A5AA1D4EAFF4E9DB345F5DDEF639888`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/mixed; boundary=${boundary}`,
      'User-Agent': 'Giraffe/1.0.0',
    },
    body: `--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n${configPath}\r\n\r\n${JSON.stringify(
      {
        context: {
          synthesize: {
            audio: {
              metadataoptions: { sentenceBoundarySilence: 0 },
              pronunciation: { progressivesynthesis: false },
            },
          },
        },
      },
    )}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n${pathBody}\r\n--${boundary}--\r\n`,
  });

  if (!res.ok) {
    throw new Error(`Edge TTS error ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  return {
    audioBase64: Buffer.from(buffer).toString('base64'),
  };
}

async function synthesizeBark(
  text: string,
  apiKey: string,
  options: TTSSynthesizeOptions,
): Promise<TTSResult> {
  const { voice = 'v2/en_speaker_6', model = 'suno/bark' } = options;

  const body: Record<string, unknown> = {
    inputs: `${voice}|${text}`,
    parameters: { wait_for_model: true },
  };

  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Bark TTS error ${res.status}: ${errText}`);
  }

  const buffer = await res.arrayBuffer();
  return {
    audioBase64: Buffer.from(buffer).toString('base64'),
  };
}

async function synthesizeSilero(
  text: string,
  apiKey: string,
  options: TTSSynthesizeOptions,
): Promise<TTSResult> {
  const { voice = 'en_21' } = options;

  const body: Record<string, unknown> = {
    inputs: text,
    parameters: { voice },
  };

  const res = await fetch(
    'https://api-inference.huggingface.co/models/sileroai/silero-wav2vec2-large',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Silero TTS error ${res.status}: ${errText}`);
  }

  const buffer = await res.arrayBuffer();
  return {
    audioBase64: Buffer.from(buffer).toString('base64'),
  };
}
