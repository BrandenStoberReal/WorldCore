import { describe, expect, it } from 'bun:test';
import { ChatCompletionRequestSchema } from '@/shared/schemas/backends/chatcompletions';
import { TextCompletionRequestSchema } from '@/shared/schemas/backends/textcompletions';

describe('ChatCompletionRequest parsing', () => {
  it('parses minimal valid request', () => {
    const result = ChatCompletionRequestSchema.safeParse({
      chat_completion_source: 'openai',
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hello!' },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.chat_completion_source).toBe('openai');
      expect(result.data.stream).toBe(false);
    }
  });

  it('parses full request with all options', () => {
    const result = ChatCompletionRequestSchema.safeParse({
      chat_completion_source: 'openrouter',
      model: 'meta-llama/llama-3-8b-instruct',
      messages: [
        { role: 'system', content: 'Be concise.', name: 'system' },
        { role: 'user', content: 'What is 2+2?' },
        { role: 'assistant', content: '4', name: 'assistant' },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 100,
      min_tokens: 10,
      top_p: 0.95,
      top_k: 50,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
      stop: ['\n', 'END'],
      seed: 42,
      logprobs: true,
      top_logprobs: 5,
      custom_field: 'preserved',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stream).toBe(true);
      expect(result.data.temperature).toBe(0.7);
      const rawData = result.data as Record<string, unknown>;
      expect(rawData.custom_field).toBe('preserved');
    }
  });

  it('parses with tool call message', () => {
    const result = ChatCompletionRequestSchema.safeParse({
      chat_completion_source: 'custom',
      model: 'test-model',
      messages: [
        { role: 'user', content: 'Run a function' },
        {
          role: 'assistant',
          content: '',
          tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'test' } }],
        },
        { role: 'tool', content: 'result', tool_call_id: 'call_1' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid source', () => {
    const result = ChatCompletionRequestSchema.safeParse({
      chat_completion_source: 'invalid_source',
      model: 'test',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('TextCompletionRequest parsing', () => {
  it('parses minimal valid request', () => {
    const result = TextCompletionRequestSchema.safeParse({
      text_completion_source: 'kobold',
      model: 'test-model',
      prompt: 'Once upon a time',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.text_completion_source).toBe('kobold');
    }
  });

  it('parses full request with parameters', () => {
    const result = TextCompletionRequestSchema.safeParse({
      text_completion_source: 'ollama',
      model: 'llama3',
      prompt: 'Write a story about',
      max_context: 4096,
      max_length: 200,
      temperature: 0.8,
      top_p: 0.9,
      top_k: 40,
      rep_pen: 1.1,
      stop: ['\n\n'],
      custom_option: 'preserved',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.max_context).toBe(4096);
      const rawData = result.data as Record<string, unknown>;
      expect(rawData.custom_option).toBe('preserved');
    }
  });

  it('rejects invalid source', () => {
    const result = TextCompletionRequestSchema.safeParse({
      text_completion_source: 'invalid_source',
      model: 'test',
      prompt: 'hello',
    });
    expect(result.success).toBe(false);
  });
});
