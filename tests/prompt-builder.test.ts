import { describe, it, expect } from 'bun:test';
import { flattenMessagesToPrompt, type InstructFlattenParams } from '../src/lib/api';

const gemma4Instruct: InstructFlattenParams = {
  enabled: true,
  inputSequence: '<|turn>user\n',
  inputSuffix: '<turn|>\n',
  outputSequence: '<|turn>model\n',
  outputSuffix: '<turn|>\n',
  systemSequence: '<|turn>system\n',
  systemSuffix: '<turn|>\n',
  separatorSequence: '',
  firstOutputSequence: '',
  lastOutputSequence: '',
  firstInputSequence: '',
  lastInputSequence: '',
  lastSystemSequence: '',
  names: false,
  wrap: false,
};

const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' },
  { role: 'assistant', content: 'Hi there!' },
  { role: 'user', content: 'How are you?' },
];

describe('flattenMessagesToPrompt', () => {
  describe('without instruct mode', () => {
    it('returns plain role: content format when instruct is undefined', () => {
      const result = flattenMessagesToPrompt(messages);
      expect(result).toBe(
        '[System: You are a helpful assistant.]\n\nuser: Hello!\n\nassistant: Hi there!\n\nuser: How are you?',
      );
    });

    it('returns plain format when instruct.enabled is false', () => {
      const result = flattenMessagesToPrompt(messages, { ...gemma4Instruct, enabled: false });
      expect(result).toBe(
        '[System: You are a helpful assistant.]\n\nuser: Hello!\n\nassistant: Hi there!\n\nuser: How are you?',
      );
    });
  });

  describe('with Gemma4 instruct template', () => {
    it('formats system message with systemSequence and systemSuffix', () => {
      const result = flattenMessagesToPrompt(
        [{ role: 'system', content: 'You are a helpful assistant.' }],
        gemma4Instruct,
      );
      expect(result).toBe('<|turn>system\nYou are a helpful assistant.<turn|>\n');
    });

    it('formats user message with inputSequence and inputSuffix', () => {
      const result = flattenMessagesToPrompt(
        [{ role: 'user', content: 'Hello!' }],
        gemma4Instruct,
      );
      expect(result).toBe('<|turn>user\nHello!<turn|>\n');
    });

    it('formats assistant message with outputSequence and outputSuffix', () => {
      const result = flattenMessagesToPrompt(
        [{ role: 'assistant', content: 'Hi there!' }],
        gemma4Instruct,
      );
      expect(result).toBe('<|turn>model\nHi there!<turn|>\n');
    });

    it('uses firstInputSequence for first user message when provided', () => {
      const instruct = { ...gemma4Instruct, firstInputSequence: '<|turn>user\n' };
      const result = flattenMessagesToPrompt(
        [{ role: 'user', content: 'Hello!' }],
        instruct,
      );
      expect(result).toBe('<|turn>user\nHello!<turn|>\n');
    });

    it('uses lastOutputSequence as suffix for first assistant message when provided', () => {
      const instruct = { ...gemma4Instruct, lastOutputSequence: '<turn|>\n' };
      const result = flattenMessagesToPrompt(
        [{ role: 'assistant', content: 'Hi there!' }],
        instruct,
      );
      expect(result).toBe('<|turn>model\nHi there!<turn|>\n');
    });

    it('concatenates messages with separatorSequence', () => {
      const instruct = { ...gemma4Instruct, separatorSequence: '\n' };
      const result = flattenMessagesToPrompt(
        [
          { role: 'user', content: 'Hello!' },
          { role: 'assistant', content: 'Hi there!' },
        ],
        instruct,
      );
      expect(result).toBe('<|turn>user\nHello!<turn|>\n\n<|turn>model\nHi there!<turn|>\n');
    });

    it('handles full conversation with Gemma4 template', () => {
      const result = flattenMessagesToPrompt(messages, gemma4Instruct);
      const expected = [
        '<|turn>system\nYou are a helpful assistant.<turn|>\n',
        '<|turn>user\nHello!<turn|>\n',
        '<|turn>model\nHi there!<turn|>\n',
        '<|turn>user\nHow are you?<turn|>\n',
      ].join('');
      expect(result).toBe(expected);
    });

    it('includes name prefix when names is true', () => {
      const instruct = { ...gemma4Instruct, names: true };
      const result = flattenMessagesToPrompt(
        [{ role: 'user', content: 'Hello!', name: 'Alice' }],
        instruct,
      );
      expect(result).toBe('Alice: <|turn>user\nHello!<turn|>\n');
    });
  });

  describe('edge cases', () => {
    it('handles empty messages array', () => {
      const result = flattenMessagesToPrompt([], gemma4Instruct);
      expect(result).toBe('');
    });

    it('handles messages with empty content', () => {
      const result = flattenMessagesToPrompt(
        [{ role: 'user', content: '' }],
        gemma4Instruct,
      );
      expect(result).toBe('<|turn>user\n<turn|>\n');
    });

    it('handles messages with special characters', () => {
      const result = flattenMessagesToPrompt(
        [{ role: 'user', content: 'Hello <world> & "friends"' }],
        gemma4Instruct,
      );
      expect(result).toBe('<|turn>user\nHello <world> & "friends"<turn|>\n');
    });
  });
});
