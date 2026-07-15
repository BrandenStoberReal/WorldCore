import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  SecretValueSchema,
  SecretStateSchema,
  SecretStateMapSchema,
} from '@/shared/schemas/secret';

const readFixture = (path: string) => JSON.parse(readFileSync(path, 'utf-8'));

describe('SecretValue parsing', () => {
  it('parses valid secret value', () => {
    const result = SecretValueSchema.safeParse({
      id: 'openai_key',
      value: 'sk-sample-key',
      label: 'OpenAI Key',
      active: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('openai_key');
      expect(result.data.active).toBe(true);
    }
  });

  it('parses secret value without optional fields', () => {
    const result = SecretValueSchema.safeParse({
      id: 'groq_key',
      value: 'gsk-sample',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.active).toBe(true);
    }
  });

  it('rejects invalid secret key', () => {
    const result = SecretValueSchema.safeParse({
      id: 'nonexistent_key',
      value: 'some-value',
    });
    expect(result.success).toBe(false);
  });
});

describe('SecretState parsing', () => {
  it('parses valid secret state', () => {
    const result = SecretStateSchema.safeParse({
      id: 'deepseek_key',
      value: 'sk-deepseek-123',
      label: 'DeepSeek',
      active: true,
    });
    expect(result.success).toBe(true);
  });
});

describe('SecretStateMap parsing', () => {
  it('parses legacy secrets fixture', () => {
    const fixture = readFixture('tests/fixtures/secrets/legacy.json');
    const result = SecretStateMapSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.data).length).toBe(3);
      expect(result.data['open_router_key']?.active).toBe(true);
      expect(result.data['koboldai_url']?.active).toBe(false);
    }
  });

  it('parses new secrets fixture', () => {
    const fixture = readFixture('tests/fixtures/secrets/new.json');
    const result = SecretStateMapSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Object.keys(result.data).length).toBe(4);
      expect(result.data['groq_key']?.active).toBe(false);
      expect(result.data['ollama_url']?.active).toBe(true);
    }
  });
});
