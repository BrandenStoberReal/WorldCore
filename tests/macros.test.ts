import { describe, it, expect } from 'bun:test';
import { substituteMacros, type MacroContext } from '../src/lib/macros';

const ctx: MacroContext = { userName: 'Alice', characterName: 'Bob' };

const fullCtx: MacroContext = {
  userName: 'Alice',
  characterName: 'Bob',
  description: 'A brave knight',
  personality: 'Chivalrous and loyal',
  scenario: 'Medieval kingdom under siege',
  first_mes: 'Greetings, traveler!',
  mes_example: '<start>\n{{user}}: Hello\n{{char}}: Hi there!',
  creator_notes: 'A character for testing',
  system_prompt: 'You are Bob',
  post_history_instructions: 'Stay in character',
};

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

  describe('character field macros', () => {
    it('substitutes {{description}}', () => {
      expect(substituteMacros('{{description}}', fullCtx)).toBe('A brave knight');
    });

    it('substitutes {{personality}}', () => {
      expect(substituteMacros('{{personality}}', fullCtx)).toBe('Chivalrous and loyal');
    });

    it('substitutes {{scenario}}', () => {
      expect(substituteMacros('{{scenario}}', fullCtx)).toBe('Medieval kingdom under siege');
    });

    it('substitutes {{first_mes}}', () => {
      expect(substituteMacros('{{first_mes}}', fullCtx)).toBe('Greetings, traveler!');
    });

    it('substitutes {{firstMes}} (camelCase variant)', () => {
      expect(substituteMacros('{{firstMes}}', fullCtx)).toBe('Greetings, traveler!');
    });

    it('substitutes {{mes_example}}', () => {
      expect(substituteMacros('{{mes_example}}', fullCtx)).toBe(
        '<start>\n{{user}}: Hello\n{{char}}: Hi there!',
      );
    });

    it('substitutes {{mesExample}} (camelCase variant)', () => {
      expect(substituteMacros('{{mesExample}}', fullCtx)).toBe(
        '<start>\n{{user}}: Hello\n{{char}}: Hi there!',
      );
    });

    it('substitutes {{creator_notes}}', () => {
      expect(substituteMacros('{{creator_notes}}', fullCtx)).toBe('A character for testing');
    });

    it('substitutes {{creatorNotes}} (camelCase variant)', () => {
      expect(substituteMacros('{{creatorNotes}}', fullCtx)).toBe('A character for testing');
    });

    it('substitutes {{system_prompt}}', () => {
      expect(substituteMacros('{{system_prompt}}', fullCtx)).toBe('You are Bob');
    });

    it('substitutes {{systemPrompt}} (camelCase variant)', () => {
      expect(substituteMacros('{{systemPrompt}}', fullCtx)).toBe('You are Bob');
    });

    it('substitutes {{post_history_instructions}}', () => {
      expect(substituteMacros('{{post_history_instructions}}', fullCtx)).toBe('Stay in character');
    });

    it('substitutes {{postHistoryInstructions}} (camelCase variant)', () => {
      expect(substituteMacros('{{postHistoryInstructions}}', fullCtx)).toBe('Stay in character');
    });

    it('substitutes multiple character field macros in one string', () => {
      const input = '{{char}} is {{personality}} in a {{scenario}}';
      expect(substituteMacros(input, fullCtx)).toBe(
        'Bob is Chivalrous and loyal in a Medieval kingdom under siege',
      );
    });

    it('returns empty string for undefined optional fields', () => {
      expect(substituteMacros('{{description}}', ctx)).toBe('');
    });

    it('is case-insensitive for character field macros', () => {
      expect(substituteMacros('{{Description}}', fullCtx)).toBe('A brave knight');
      expect(substituteMacros('{{DESCRIPTION}}', fullCtx)).toBe('A brave knight');
      expect(substituteMacros('{{PERSONALITY}}', fullCtx)).toBe('Chivalrous and loyal');
    });
  });
});
