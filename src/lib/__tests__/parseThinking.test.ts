import { describe, expect, it } from 'bun:test';
import { parseThinkingChunks } from '@/lib/parseThinking';

describe('parseThinkingChunks', () => {
  describe('no-blocks and escape', () => {
    it('returns thinking=undefined when accumulated has no prefix', () => {
      expect(
        parseThinkingChunks('hello world', { prefix: '<x>', suffix: '</x>', separator: '\n' }),
      ).toEqual({
        thinking: undefined,
        body: 'hello world',
        inThinking: false,
      });
    });

    it('returns inThinking=true with open content when prefix appears but no suffix', () => {
      expect(
        parseThinkingChunks('<x>open block no suffix', {
          prefix: '<x>',
          suffix: '</x>',
          separator: '\n',
        }),
      ).toEqual({ thinking: 'open block no suffix', body: '', inThinking: true });
    });

    it('returns thinking=undefined when prefix is empty', () => {
      expect(
        parseThinkingChunks('<x>foo</x>', { prefix: '', suffix: '</x>', separator: '\n' }),
      ).toEqual({
        thinking: undefined,
        body: '<x>foo</x>',
        inThinking: false,
      });
    });

    it('returns thinking=undefined when suffix is empty', () => {
      expect(
        parseThinkingChunks('<x>foo</x>', { prefix: '<x>', suffix: '', separator: '\n' }),
      ).toEqual({
        thinking: undefined,
        body: '<x>foo</x>',
        inThinking: false,
      });
    });
  });

  describe('single completed block', () => {
    it('extracts single thinking block from simple content (no space post-processing)', () => {
      expect(
        parseThinkingChunks('intro <x>secret</x> body', {
          prefix: '<x>',
          suffix: '</x>',
          separator: '\n',
        }),
      ).toEqual({ thinking: 'secret', body: 'intro  body', inThinking: false });
    });

    it('handles thinking block at start of string', () => {
      expect(
        parseThinkingChunks('<x>thinking</x> body', {
          prefix: '<x>',
          suffix: '</x>',
          separator: '\n',
        }),
      ).toEqual({
        thinking: 'thinking',
        body: ' body',
        inThinking: false,
      });
    });

    it('handles thinking block at end of string', () => {
      expect(
        parseThinkingChunks('body <x>thinking</x>', {
          prefix: '<x>',
          suffix: '</x>',
          separator: '\n',
        }),
      ).toEqual({
        thinking: 'thinking',
        body: 'body ',
        inThinking: false,
      });
    });

    it('handles thinking block as entire string', () => {
      expect(
        parseThinkingChunks('<x>thinking</x>', { prefix: '<x>', suffix: '</x>', separator: '\n' }),
      ).toEqual({
        thinking: 'thinking',
        body: '',
        inThinking: false,
      });
    });
  });

  describe('multi-block', () => {
    it('joins multiple thinking blocks with separator', () => {
      expect(
        parseThinkingChunks('a<x>1</x>b<x>2</x>c', {
          prefix: '<x>',
          suffix: '</x>',
          separator: '\n',
        }),
      ).toEqual({ thinking: '1\n2', body: 'abc', inThinking: false });
    });

    it('joins multiple thinking blocks with empty separator', () => {
      expect(
        parseThinkingChunks('a<x>1</x>b<x>2</x>c', {
          prefix: '<x>',
          suffix: '</x>',
          separator: '',
        }),
      ).toEqual({
        thinking: '12',
        body: 'abc',
        inThinking: false,
      });
    });

    it('joins three thinking blocks', () => {
      expect(
        parseThinkingChunks('<x>a</x>x<x>b</x>y<x>c</x>', {
          prefix: '<x>',
          suffix: '</x>',
          separator: '--',
        }),
      ).toEqual({ thinking: 'a--b--c', body: 'xy', inThinking: false });
    });
  });

  describe('empty-block semantics', () => {
    it('returns thinking=undefined when matched block has empty content', () => {
      expect(
        parseThinkingChunks('a<x></x>b', { prefix: '<x>', suffix: '</x>', separator: '\n' }),
      ).toEqual({
        thinking: undefined,
        body: 'ab',
        inThinking: false,
      });
    });

    it('preserves whitespace-only content (length check, not trim check)', () => {
      expect(
        parseThinkingChunks('a<x>   </x>b', { prefix: '<x>', suffix: '</x>', separator: '\n' }),
      ).toEqual({
        thinking: '   ',
        body: 'ab',
        inThinking: false,
      });
    });
  });

  describe('regex metacharacters in prefix/suffix', () => {
    it('handles prefix with regex metacharacters [{ and }]', () => {
      expect(
        parseThinkingChunks('a[{think}]b', { prefix: '[{', suffix: '}]', separator: '\n' }),
      ).toEqual({
        thinking: 'think',
        body: 'ab',
        inThinking: false,
      });
    });

    it('handles prefix/suffix with literal backslashes', () => {
      expect(
        parseThinkingChunks('\\start hello\\end world', {
          prefix: '\\start',
          suffix: '\\end',
          separator: '\n',
        }),
      ).toEqual({ thinking: ' hello', body: ' world', inThinking: false });
    });

    it('handles prefix with dot and asterisk as literals', () => {
      expect(
        parseThinkingChunks('<x.*>thinking</x>', {
          prefix: '<x.*>',
          suffix: '</x>',
          separator: '\n',
        }),
      ).toEqual({
        thinking: 'thinking',
        body: '',
        inThinking: false,
      });
    });
  });

  describe('streaming partial suffix', () => {
    it('detects open block when prefix arrives but no suffix', () => {
      expect(
        parseThinkingChunks('<x>partial thinking', {
          prefix: '<x>',
          suffix: '</x>',
          separator: '\n',
        }),
      ).toEqual({
        thinking: 'partial thinking',
        body: '',
        inThinking: true,
      });
    });

    it('preserves body content before the open prefix', () => {
      expect(
        parseThinkingChunks('intro <x>partial', { prefix: '<x>', suffix: '</x>', separator: '\n' }),
      ).toEqual({
        thinking: 'partial',
        body: 'intro ',
        inThinking: true,
      });
    });

    it('appends open content to existing completed captures without separator', () => {
      expect(
        parseThinkingChunks('a<x>bb</x>b<x>incomplete', {
          prefix: '<x>',
          suffix: '</x>',
          separator: '\n',
        }),
      ).toEqual({ thinking: 'bbincomplete', body: 'ab', inThinking: true });
    });
  });

  describe('multi-block plus open tail', () => {
    it('joins completed captures then appends open content', () => {
      expect(
        parseThinkingChunks('a<x>1</x>b<x>2</x>c<x>open', {
          prefix: '<x>',
          suffix: '</x>',
          separator: '\n',
        }),
      ).toEqual({ thinking: '1\n2open', body: 'abc', inThinking: true });
    });
  });

  describe('chunked streaming simulation', () => {
    it('progressively parses a single block as chunks arrive', () => {
      const opts = { prefix: '<x>', suffix: '</x>', separator: '\n' };

      expect(parseThinkingChunks('', opts)).toEqual({
        thinking: undefined,
        body: '',
        inThinking: false,
      });

      expect(parseThinkingChunks('<x>', opts)).toEqual({
        thinking: undefined,
        body: '',
        inThinking: true,
      });

      expect(parseThinkingChunks('<x>th', opts)).toEqual({
        thinking: 'th',
        body: '',
        inThinking: true,
      });

      expect(parseThinkingChunks('<x>thinking', opts)).toEqual({
        thinking: 'thinking',
        body: '',
        inThinking: true,
      });

      expect(parseThinkingChunks('<x>thinking</x>', opts)).toEqual({
        thinking: 'thinking',
        body: '',
        inThinking: false,
      });

      expect(parseThinkingChunks('<x>thinking</x> body', opts)).toEqual({
        thinking: 'thinking',
        body: ' body',
        inThinking: false,
      });
    });
  });
});
