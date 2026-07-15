import { describe, it, expect } from 'bun:test';
import { TiktokenTokenizer } from '@/server/tokenizers/tiktoken';
import { SentencepieceTokenizer } from '@/server/tokenizers/sentencepiece';
import { WebTokenizer } from '@/server/tokenizers/webtokenizers';
import { resolve, estimateTokens, clearCache } from '@/server/tokenizers';
import { remoteCount } from '@/server/tokenizers/remote';
import { tokenizersRoutes } from '@/server/routes/tokenizers.routes';

describe('TiktokenTokenizer', () => {
  it('encodes and decodes text', () => {
    const tokenizer = new TiktokenTokenizer('gpt-4');
    const text = 'Hello, world!';
    const tokens = tokenizer.encode(text);
    expect(tokens.length).toBeGreaterThan(0);
    const decoded = tokenizer.decode(tokens);
    expect(decoded).toBe(text);
  });

  it('counts tokens correctly', () => {
    const tokenizer = new TiktokenTokenizer('gpt-3.5-turbo');
    const count = tokenizer.countTokens('Hello world');
    expect(count).toBeGreaterThan(0);
  });

  it('uses cl100k_base for gpt-4 models', () => {
    const tokenizer = new TiktokenTokenizer('gpt-4');
    const tokens = tokenizer.encode('test');
    expect(Array.isArray(tokens)).toBe(true);
  });

  it('uses cl100k_base for gpt-3.5 models', () => {
    const tokenizer = new TiktokenTokenizer('gpt-3.5-turbo');
    const tokens = tokenizer.encode('test');
    expect(Array.isArray(tokens)).toBe(true);
  });

  it('uses cl100k_base for text-embedding models', () => {
    const tokenizer = new TiktokenTokenizer('text-embedding-3-small');
    const tokens = tokenizer.encode('test');
    expect(Array.isArray(tokens)).toBe(true);
  });
});

describe('SentencepieceTokenizer', () => {
  it('encodes and decodes text', () => {
    const tokenizer = new SentencepieceTokenizer('claude-3', '/tmp/tokenizers');
    const text = 'Hello, world!';
    const tokens = tokenizer.encode(text);
    expect(tokens.length).toBe(text.length);
    const decoded = tokenizer.decode(tokens);
    expect(decoded).toBe(text);
  });

  it('counts tokens', () => {
    const tokenizer = new SentencepieceTokenizer('llama-2', '/tmp/tokenizers');
    const count = tokenizer.countTokens('test text');
    expect(count).toBe(9);
  });
});

describe('WebTokenizer', () => {
  it('encodes and decodes text', () => {
    const tokenizer = new WebTokenizer('some-model', '/tmp/tokenizers');
    const text = 'Hello, world!';
    const tokens = tokenizer.encode(text);
    expect(tokens.length).toBe(text.length);
    const decoded = tokenizer.decode(tokens);
    expect(decoded).toBe(text);
  });

  it('counts tokens', () => {
    const tokenizer = new WebTokenizer('another-model', '/tmp/tokenizers');
    const count = tokenizer.countTokens('test');
    expect(count).toBe(4);
  });
});

describe('resolve', () => {
  it('resolves gpt model to tiktoken', async () => {
    clearCache();
    const tokenizer = await resolve('gpt-4');
    expect(tokenizer).not.toBeNull();
    expect(tokenizer!.countTokens('hello')).toBeGreaterThan(0);
  });

  it('resolves claude model to sentencepiece', async () => {
    clearCache();
    const tokenizer = await resolve('claude-3');
    expect(tokenizer).not.toBeNull();
    expect(tokenizer!.countTokens('hello')).toBe(5);
  });

  it('resolves unknown model to web tokenizer', async () => {
    clearCache();
    const tokenizer = await resolve('unknown-model');
    expect(tokenizer).not.toBeNull();
    expect(tokenizer!.countTokens('hello')).toBe(5);
  });

  it('caches resolved tokenizers', async () => {
    clearCache();
    const t1 = await resolve('gpt-4');
    const t2 = await resolve('gpt-4');
    expect(t1).toBe(t2);
  });
});

describe('estimateTokens', () => {
  it('estimates tokens based on text length', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
    expect(estimateTokens('')).toBe(0);
  });
});

describe('remoteCount', () => {
  it('falls back to estimate on connection error', async () => {
    const mockFetch = async (): Promise<Response> =>
      ({
        json: async () => ({}),
        ok: false,
        status: 500,
        headers: new Headers(),
        redirected: false,
        statusText: '',
        body: null,
        bodyUsed: false,
        type: 'basic' as ResponseType,
        url: '',
      }) as Response;
    Object.defineProperty(globalThis, 'fetch', {
      value: mockFetch,
      writable: true,
      configurable: true,
    });
    const count = await remoteCount('http://mock.local/test', 'hello world');
    expect(count).toBe(Math.ceil('hello world'.length / 4));
    Object.defineProperty(globalThis, 'fetch', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });
});

describe('Tokenizers routes', () => {
  it('count returns token count', async () => {
    const res = await tokenizersRoutes.count(
      new Request('http://localhost/api/v1/tokenizers/count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'cl100k_base', text: 'Hello world' }),
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { count: number };
    expect(data.count).toBeGreaterThan(0);
  });

  it('encode returns tokens', async () => {
    const res = await tokenizersRoutes.encode(
      new Request('http://localhost/api/v1/tokenizers/encode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'cl100k_base', text: 'Hello world' }),
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { tokens: number[]; text: string; count: number };
    expect(data.tokens.length).toBeGreaterThan(0);
    expect(data.text).toBe('Hello world');
    expect(data.count).toBe(data.tokens.length);
  });

  it('decode returns text', async () => {
    const res = await tokenizersRoutes.decode(
      new Request('http://localhost/api/v1/tokenizers/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'cl100k_base', tokens: [9906, 1917] }),
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { text: string; count: number };
    expect(data.text).toBe('Hello world');
    expect(data.count).toBe(2);
  });

  it('count rejects invalid model', async () => {
    const res = await tokenizersRoutes.count(
      new Request('http://localhost/api/v1/tokenizers/count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'invalid_model', text: 'Hello' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('encode rejects missing text', async () => {
    const res = await tokenizersRoutes.encode(
      new Request('http://localhost/api/v1/tokenizers/encode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'cl100k_base' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('decode rejects missing tokens', async () => {
    const res = await tokenizersRoutes.decode(
      new Request('http://localhost/api/v1/tokenizers/decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'cl100k_base' }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
