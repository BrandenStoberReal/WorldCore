import { describe, it, expect } from 'bun:test';
import { dispatcher } from '@/server/backends/text-completions';

describe('TextCompletion dispatcher', () => {
  it('resolves kobold adapter', async () => {
    const adapter = await dispatcher('kobold');
    expect(adapter.source).toBe('kobold');
    expect(typeof adapter.forwardRequest).toBe('function');
  });

  it('resolves textgenerationwebui adapter', async () => {
    const adapter = await dispatcher('textgenerationwebui');
    expect(adapter.source).toBe('textgenerationwebui');
    expect(typeof adapter.forwardRequest).toBe('function');
  });

  it('resolves ooba adapter', async () => {
    const adapter = await dispatcher('ooba');
    expect(adapter.source).toBe('ooba');
    expect(typeof adapter.forwardRequest).toBe('function');
  });

  it('resolves aphrodite adapter', async () => {
    const adapter = await dispatcher('aphrodite');
    expect(adapter.source).toBe('aphrodite');
    expect(typeof adapter.forwardRequest).toBe('function');
  });

  it('resolves llamacpp adapter', async () => {
    const adapter = await dispatcher('llamacpp');
    expect(adapter.source).toBe('llamacpp');
    expect(typeof adapter.forwardRequest).toBe('function');
  });

  it('resolves ollama adapter', async () => {
    const adapter = await dispatcher('ollama');
    expect(adapter.source).toBe('ollama');
    expect(typeof adapter.forwardRequest).toBe('function');
  });

  it('resolves tabby adapter', async () => {
    const adapter = await dispatcher('tabby');
    expect(adapter.source).toBe('tabby');
    expect(typeof adapter.forwardRequest).toBe('function');
  });

  it('resolves mancer adapter', async () => {
    const adapter = await dispatcher('mancer');
    expect(adapter.source).toBe('mancer');
    expect(typeof adapter.forwardRequest).toBe('function');
  });

  it('resolves vllm adapter', async () => {
    const adapter = await dispatcher('vllm');
    expect(adapter.source).toBe('vllm');
    expect(typeof adapter.forwardRequest).toBe('function');
  });

  it('resolves openrouter adapter', async () => {
    const adapter = await dispatcher('openrouter');
    expect(adapter.source).toBe('openrouter');
    expect(typeof adapter.forwardRequest).toBe('function');
  });

  it('resolves featherless adapter', async () => {
    const adapter = await dispatcher('featherless');
    expect(adapter.source).toBe('featherless');
    expect(typeof adapter.forwardRequest).toBe('function');
  });

  it('resolves huggingface adapter', async () => {
    const adapter = await dispatcher('huggingface');
    expect(adapter.source).toBe('huggingface');
    expect(typeof adapter.forwardRequest).toBe('function');
  });

  it('resolves dreamgen adapter', async () => {
    const adapter = await dispatcher('dreamgen');
    expect(adapter.source).toBe('dreamgen');
    expect(typeof adapter.forwardRequest).toBe('function');
  });

  it('resolves togetherai adapter', async () => {
    const adapter = await dispatcher('togetherai');
    expect(adapter.source).toBe('togetherai');
    expect(typeof adapter.forwardRequest).toBe('function');
  });

  it('resolves infermaticai adapter', async () => {
    const adapter = await dispatcher('infermaticai');
    expect(adapter.source).toBe('infermaticai');
    expect(typeof adapter.forwardRequest).toBe('function');
  });

  it('resolves generic adapter', async () => {
    const adapter = await dispatcher('generic');
    expect(adapter.source).toBe('generic');
    expect(typeof adapter.forwardRequest).toBe('function');
  });

  it('caches adapter instances', async () => {
    const a1 = await dispatcher('kobold');
    const a2 = await dispatcher('kobold');
    expect(a1).toBe(a2);
  });
});
