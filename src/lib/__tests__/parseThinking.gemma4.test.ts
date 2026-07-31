import { describe, it, expect } from 'bun:test';
import { parseThinkingChunks } from '@/lib/parseThinking';

describe('parseThinkingChunks - Gemma4 style', () => {
  const gemma4Opts = {
    prefix: '<|channel>thought\n',
    suffix: '<channel|>',
    separator: '\n\n',
  };

  describe('basic parsing', () => {
    it('extracts thinking block between channel tags', () => {
      const input = '<|channel>thought\nLet me think about this\n<channel|>Hello there!';
      const result = parseThinkingChunks(input, gemma4Opts);
      expect(result.thinking).toBe('Let me think about this\n');
      expect(result.body).toBe('Hello there!');
      expect(result.inThinking).toBe(false);
    });

    it('handles thinking block at start of string', () => {
      const input = '<|channel>thought\nReasoning here\n<channel|>Response';
      const result = parseThinkingChunks(input, gemma4Opts);
      expect(result.thinking).toBe('Reasoning here\n');
      expect(result.body).toBe('Response');
      expect(result.inThinking).toBe(false);
    });

    it('handles thinking block at end of string', () => {
      const input = 'Response<|channel>thought\nThinking\n<channel|>';
      const result = parseThinkingChunks(input, gemma4Opts);
      expect(result.thinking).toBe('Thinking\n');
      expect(result.body).toBe('Response');
      expect(result.inThinking).toBe(false);
    });

    it('handles thinking block as entire string', () => {
      const input = '<|channel>thought\nOnly thinking\n<channel|>';
      const result = parseThinkingChunks(input, gemma4Opts);
      expect(result.thinking).toBe('Only thinking\n');
      expect(result.body).toBe('');
      expect(result.inThinking).toBe(false);
    });
  });

  describe('multi-line thinking', () => {
    it('preserves newlines in thinking content', () => {
      const input = '<|channel>thought\nLine 1\nLine 2\nLine 3\n<channel|>Response';
      const result = parseThinkingChunks(input, gemma4Opts);
      expect(result.thinking).toBe('Line 1\nLine 2\nLine 3\n');
      expect(result.body).toBe('Response');
    });

    it('handles thinking with blank lines', () => {
      const input = '<|channel>thought\nParagraph 1\n\nParagraph 2\n<channel|>Response';
      const result = parseThinkingChunks(input, gemma4Opts);
      expect(result.thinking).toBe('Paragraph 1\n\nParagraph 2\n');
      expect(result.body).toBe('Response');
    });
  });

  describe('multiple thinking blocks', () => {
    it('joins multiple thinking blocks with separator', () => {
      const input = '<|channel>thought\nThinking 1\n<channel|>Middle<|channel>thought\nThinking 2\n<channel|>End';
      const result = parseThinkingChunks(input, gemma4Opts);
      expect(result.thinking).toBe('Thinking 1\n\n\nThinking 2\n');
      expect(result.body).toBe('MiddleEnd');
    });
  });

  describe('streaming simulation', () => {
    it('detects inThinking when prefix arrives but no suffix', () => {
      const input = '<|channel>thought\nPartial thinking';
      const result = parseThinkingChunks(input, gemma4Opts);
      expect(result.thinking).toBe('Partial thinking');
      expect(result.body).toBe('');
      expect(result.inThinking).toBe(true);
    });

    it('progressively parses as chunks arrive', () => {
      const opts = gemma4Opts;

      expect(parseThinkingChunks('', opts)).toEqual({
        thinking: undefined,
        body: '',
        inThinking: false,
      });

      expect(parseThinkingChunks('<|channel>', opts)).toEqual({
        thinking: undefined,
        body: '',
        inThinking: true,
      });

      expect(parseThinkingChunks('<|channel>thought\n', opts)).toEqual({
        thinking: undefined,
        body: '',
        inThinking: true,
      });

      expect(parseThinkingChunks('<|channel>thought\nThinking...', opts)).toEqual({
        thinking: 'Thinking...',
        body: '',
        inThinking: true,
      });

      expect(parseThinkingChunks('<|channel>thought\nThinking...\n<channel|>', opts)).toEqual({
        thinking: 'Thinking...\n',
        body: '',
        inThinking: false,
      });

      expect(
        parseThinkingChunks('<|channel>thought\nThinking...\n<channel|>Response text', opts),
      ).toEqual({
        thinking: 'Thinking...\n',
        body: 'Response text',
        inThinking: false,
      });
    });
  });

  describe('no thinking block', () => {
    it('returns body as-is when no prefix found', () => {
      const input = 'Just regular response text';
      const result = parseThinkingChunks(input, gemma4Opts);
      expect(result.thinking).toBeUndefined();
      expect(result.body).toBe('Just regular response text');
      expect(result.inThinking).toBe(false);
    });
  });

  describe('empty thinking block', () => {
    it('returns thinking=undefined for empty block', () => {
      const input = '<|channel>thought\n<channel|>Response';
      const result = parseThinkingChunks(input, gemma4Opts);
      expect(result.thinking).toBeUndefined();
      expect(result.body).toBe('Response');
      expect(result.inThinking).toBe(false);
    });
  });

  describe('regex safety', () => {
    it('handles pipe characters in suffix correctly', () => {
      const input = '<|channel>thought\nThinking\n<channel|>Body';
      const result = parseThinkingChunks(input, gemma4Opts);
      expect(result.thinking).toBe('Thinking\n');
      expect(result.body).toBe('Body');
    });

    it('handles angle brackets in prefix correctly', () => {
      const input = '<|channel>thought\nThinking\n<channel|>Body';
      const result = parseThinkingChunks(input, gemma4Opts);
      expect(result.thinking).toBe('Thinking\n');
      expect(result.body).toBe('Body');
    });
  });
});

describe('parseThinkingChunks - simple tags', () => {
  it('handles <think> tags', () => {
    const input = '<think>Let me think</think>Hello!';
    const result = parseThinkingChunks(input, {
      prefix: '<think>',
      suffix: '</think>',
      separator: '\n',
    });
    expect(result.thinking).toBe('Let me think');
    expect(result.body).toBe('Hello!');
    expect(result.inThinking).toBe(false);
  });

  it('handles <think> tags', () => {
    const input = '<think>reasoning</think>response';
    const result = parseThinkingChunks(input, {
      prefix: '<think>',
      suffix: '</think>',
      separator: '\n',
    });
    expect(result.thinking).toBe('reasoning');
    expect(result.body).toBe('response');
    expect(result.inThinking).toBe(false);
  });
});
