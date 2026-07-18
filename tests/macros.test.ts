import { describe, it, expect } from 'bun:test';
import { substituteMacros, type MacroContext } from '../src/lib/macros';

const ctx: MacroContext = { userName: 'Alice', characterName: 'Bob' };

describe('substituteMacros', () => {
  it('returns empty string for empty input', () => {
    expect(substituteMacros('', ctx)).toBe('');
  });

  it('returns input unchanged when no macros are present', () => {
    expect(substituteMacros('Hello world, no macros here.', ctx)).toBe(
      'Hello world, no macros here.',
    );
  });

  it('substitutes {{user}} alone', () => {
    expect(substituteMacros('{{user}}', ctx)).toBe('Alice');
  });

  it('substitutes {{char}} alone', () => {
    expect(substituteMacros('{{char}}', ctx)).toBe('Bob');
  });

  it('substitutes both {{user}} and {{char}} in one string', () => {
    expect(substituteMacros('{{user}} says hello to {{char}}', ctx)).toBe(
      'Alice says hello to Bob',
    );
  });

  it('matches macro names case-insensitively', () => {
    expect(substituteMacros('{{User}}', ctx)).toBe('Alice');
    expect(substituteMacros('{{USER}}', ctx)).toBe('Alice');
    expect(substituteMacros('{{Char}}', ctx)).toBe('Bob');
    expect(substituteMacros('{{CHAR}}', ctx)).toBe('Bob');
  });

  it('tolerates internal whitespace (single and multiple spaces)', () => {
    expect(substituteMacros('{{ user }}', ctx)).toBe('Alice');
    expect(substituteMacros('{{  char  }}', ctx)).toBe('Bob');
  });

  it('supports common variants personaName and characterName', () => {
    expect(substituteMacros('{{personaName}}', ctx)).toBe('Alice');
    expect(substituteMacros('{{characterName}}', ctx)).toBe('Bob');
  });

  it('substitutes chained macros in the same string', () => {
    expect(substituteMacros('{{user}} {{user}} {{char}}', ctx)).toBe(
      'Alice Alice Bob',
    );
  });

  it('substitutes macros embedded in regular text', () => {
    expect(substituteMacros('Hello there, {{user}}! Welcome to the shop.', ctx)).toBe(
      'Hello there, Alice! Welcome to the shop.',
    );
  });

  it('substitutes macros inside fenced code blocks (no fence protection)', () => {
    const input = "```js\nconst u = '{{user}}';\n```";
    expect(substituteMacros(input, ctx)).toBe("```js\nconst u = 'Alice';\n```");
  });

  it('passes unknown tokens through unchanged', () => {
    expect(substituteMacros('{{age}}', ctx)).toBe('{{age}}');
    expect(substituteMacros('{{ unknown }}', ctx)).toBe('{{ unknown }}');
  });

  it('substitutes with empty string when ctx field is empty (preserves surrounding text)', () => {
    const emptyCtx: MacroContext = { userName: '', characterName: 'Bob' };
    expect(substituteMacros('Hi {{user}}', emptyCtx)).toBe('Hi ');
  });

  it('does not re-resolve macro-looking replacement strings (single pass)', () => {
    const trickyCtx: MacroContext = { userName: '{{char}}', characterName: 'Bob' };
    expect(substituteMacros('{{user}}', trickyCtx)).toBe('{{char}}');
  });

  it('leaves macro-form text with non-letter content unchanged', () => {
    expect(substituteMacros('{{"a":1}}', ctx)).toBe('{{"a":1}}');
    expect(substituteMacros('{{1+1}}', ctx)).toBe('{{1+1}}');
  });
});
