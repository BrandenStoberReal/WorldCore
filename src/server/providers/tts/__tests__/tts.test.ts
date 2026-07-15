import { describe, it, expect } from 'bun:test';
import {
  TTSProviderSchema,
  STTProviderSchema,
  TTSSynthesizeRequestSchema,
  TTSSynthesizeResponseSchema,
  STTTranscribeRequestSchema,
  STTTranscribeResponseSchema,
} from '@/shared/schemas/speech';

describe('TTS schemas', () => {
  it('validates all 8 TTS providers', () => {
    const providers = [
      'openai',
      'azure',
      'elevenlabs',
      'edge',
      'coqui',
      'bark',
      'custom',
      'silero',
    ];
    for (const p of providers) {
      const result = TTSProviderSchema.safeParse(p);
      expect(result.success).toBe(true);
    }
  });

  it('rejects unknown TTS provider', () => {
    const result = TTSProviderSchema.safeParse('unknown');
    expect(result.success).toBe(false);
  });

  it('parses valid TTS request', () => {
    const result = TTSSynthesizeRequestSchema.safeParse({
      text: 'Hello world',
      provider: 'openai',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe('openai');
      expect(result.data.text).toBe('Hello world');
      expect(result.data.speed).toBe(1);
    }
  });

  it('defaults TTS provider to openai', () => {
    const result = TTSSynthesizeRequestSchema.safeParse({
      text: 'Hello',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe('openai');
    }
  });

  it('parses TTS request with all options', () => {
    const result = TTSSynthesizeRequestSchema.safeParse({
      text: 'Hello world',
      voice: 'alloy',
      model: 'tts-1-hd',
      speed: 1.5,
      provider: 'elevenlabs',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.voice).toBe('alloy');
      expect(result.data.model).toBe('tts-1-hd');
      expect(result.data.speed).toBe(1.5);
      expect(result.data.provider).toBe('elevenlabs');
    }
  });

  it('rejects TTS request missing text', () => {
    const result = TTSSynthesizeRequestSchema.safeParse({
      provider: 'openai',
    });
    expect(result.success).toBe(false);
  });

  it('rejects speed out of range', () => {
    const result = TTSSynthesizeRequestSchema.safeParse({
      text: 'test',
      speed: 5,
    });
    expect(result.success).toBe(false);
  });

  it('validates TTS response', () => {
    const result = TTSSynthesizeResponseSchema.safeParse({
      audioBase64: 'SGVsbG8gV29ybGQ=',
      provider: 'openai',
      voice: 'alloy',
      duration: 2.5,
    });
    expect(result.success).toBe(true);
  });
});

describe('STT schemas', () => {
  it('validates all 3 STT providers', () => {
    const providers = ['openai', 'whispercpp', 'custom'];
    for (const p of providers) {
      const result = STTProviderSchema.safeParse(p);
      expect(result.success).toBe(true);
    }
  });

  it('rejects unknown STT provider', () => {
    const result = STTProviderSchema.safeParse('unknown');
    expect(result.success).toBe(false);
  });

  it('parses valid STT request', () => {
    const result = STTTranscribeRequestSchema.safeParse({
      audioBase64: 'SGVsbG8=',
      provider: 'openai',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe('openai');
    }
  });

  it('defaults STT provider to openai', () => {
    const result = STTTranscribeRequestSchema.safeParse({
      audioBase64: 'SGVsbG8=',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe('openai');
    }
  });

  it('parses STT request with all options', () => {
    const result = STTTranscribeRequestSchema.safeParse({
      audioBase64: 'SGVsbG8=',
      model: 'whisper-large',
      language: 'en',
      provider: 'whispercpp',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBe('whisper-large');
      expect(result.data.language).toBe('en');
      expect(result.data.provider).toBe('whispercpp');
    }
  });

  it('rejects STT request missing audioBase64', () => {
    const result = STTTranscribeRequestSchema.safeParse({
      provider: 'openai',
    });
    expect(result.success).toBe(false);
  });

  it('validates STT response', () => {
    const result = STTTranscribeResponseSchema.safeParse({
      text: 'Hello world',
      provider: 'openai',
      language: 'en',
      duration: 1.5,
      words: [
        { word: 'Hello', start: 0, end: 0.5 },
        { word: 'world', start: 0.5, end: 1.5 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('validates STT response without optional fields', () => {
    const result = STTTranscribeResponseSchema.safeParse({
      text: 'Hello world',
      provider: 'openai',
    });
    expect(result.success).toBe(true);
  });
});
