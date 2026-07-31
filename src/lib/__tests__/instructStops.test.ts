import { describe, expect, it } from 'bun:test';
import type { InstructSettings } from '@/shared/types/text-options';
import type { MacroContext } from '@/lib/macros';
import { getInstructStoppingSequences, trimStopStringTail } from '@/lib/api';

function baseInstruct(overrides: Partial<InstructSettings> = {}): InstructSettings {
  return {
    enabled: true,
    selectedPreset: 'Test',
    storyStringPrefix: '',
    storyStringSuffix: '',
    inputSequence: '<|turn>user\n',
    inputSuffix: '<turn|>\n',
    outputSequence: '<|turn>model\n',
    outputSuffix: '<turn|>\n',
    systemSequence: '<|turn>system\n',
    systemSuffix: '<turn|>\n',
    firstOutputSequence: '',
    lastOutputSequence: '',
    firstInputSequence: '',
    lastInputSequence: '',
    lastSystemSequence: '',
    stopSequence: '',
    userAlignmentMessage: '',
    wrap: false,
    macro: false,
    sequencesAsStopStrings: true,
    skipExamples: false,
    namesBehavior: 'force',
    activationRegex: '',
    bindToContext: false,
    systemPrompt: '',
    separatorSequence: '',
    systemSequencePrefix: '',
    systemSequenceSuffix: '',
    names: false,
    namesForceGroups: false,
    systemSameAsUser: false,
    ...overrides,
  };
}

const macroCtx: MacroContext = {
  userName: 'Alice',
  characterName: 'Bob',
};

describe('getInstructStoppingSequences', () => {
  it('returns empty when instruct is undefined', () => {
    expect(getInstructStoppingSequences(undefined, macroCtx)).toEqual([]);
  });

  it('returns empty when instruct.enabled is false', () => {
    expect(getInstructStoppingSequences(baseInstruct({ enabled: false }), macroCtx)).toEqual([]);
  });

  it('adds stopSequence always, even when sequencesAsStopStrings is false', () => {
    const stops = getInstructStoppingSequences(
      baseInstruct({ stopSequence: '[STOP]', sequencesAsStopStrings: false }),
      macroCtx,
    );
    expect(stops).toEqual(['[STOP]']);
  });

  it('adds input/output/system sequences when sequencesAsStopStrings is true (no wrap)', () => {
    const stops = getInstructStoppingSequences(baseInstruct({ sequencesAsStopStrings: true }), macroCtx);
    expect(stops).toContain('<|turn>user\n');
    expect(stops).toContain('<|turn>model\n');
    expect(stops).toContain('<|turn>system\n');
  });

  it('prepends newline when wrap is true', () => {
    const stops = getInstructStoppingSequences(
      baseInstruct({ wrap: true, stopSequence: '[STOP]' }),
      macroCtx,
    );
    expect(stops).toContain('\n[STOP]');
    expect(stops).toContain('\n<|turn>user\n');
    expect(stops).toContain('\n<|turn>model\n');
  });

  it('does not prepend newline when wrap is false', () => {
    const stops = getInstructStoppingSequences(
      baseInstruct({ wrap: false, stopSequence: '[STOP]' }),
      macroCtx,
    );
    expect(stops).toContain('[STOP]');
    expect(stops).toContain('<|turn>user\n');
    for (const s of stops) {
      expect(s.startsWith('\n')).toBe(false);
    }
  });

  it('skips whitespace-only sequences', () => {
    const stops = getInstructStoppingSequences(
      baseInstruct({ stopSequence: '   ', systemSequence: '\n' }),
      macroCtx,
    );
    expect(stops).not.toContain('   ');
    expect(stops).not.toContain('\n');
    expect(stops).toContain('<|turn>user\n');
    expect(stops).toContain('<|turn>model\n');
  });

  it('dedupes identical sequence results', () => {
    const stops = getInstructStoppingSequences(
      baseInstruct({
        stopSequence: '<|turn>model\n',
        outputSequence: '<|turn>model\n',
        lastOutputSequence: '<|turn>model\n',
      }),
      macroCtx,
    );
    const occurrences = stops.filter((s) => s === '<|turn>model\n').length;
    expect(occurrences).toBe(1);
  });

  it('substitutes {{user}} / {{char}} macros when macro is enabled', () => {
    const stops = getInstructStoppingSequences(
      baseInstruct({
        macro: true,
        inputSequence: '### Input: {{user}}',
        outputSequence: '### Output: {{char}}',
      }),
      macroCtx,
    );
    expect(stops).toContain('### Input: Alice');
    expect(stops).toContain('### Output: Bob');
    expect(stops).not.toContain('{{user}}');
    expect(stops).not.toContain('{{char}}');
  });

  it('does not substitute macros when macro is disabled', () => {
    const stops = getInstructStoppingSequences(
      baseInstruct({
        macro: false,
        inputSequence: '### Input: {{user}}',
      }),
      macroCtx,
    );
    expect(stops).toContain('### Input: {{user}}');
  });

  it('substitutes {{name}} with characterName for output sequences', () => {
    const stops = getInstructStoppingSequences(
      baseInstruct({
        macro: false,
        outputSequence: '### {{name}}:',
        lastOutputSequence: 'X{{name}}',
      }),
      macroCtx,
    );
    expect(stops).toContain('### Bob:');
    expect(stops).toContain('XBob');
  });

  it('substitutes {{name}} with userName for input sequences', () => {
    const stops = getInstructStoppingSequences(
      baseInstruct({
        macro: false,
        inputSequence: '### {{name}}:',
        lastInputSequence: 'X{{name}}',
      }),
      macroCtx,
    );
    expect(stops).toContain('### Alice:');
    expect(stops).toContain('XAlice');
  });

  it('substitutes {{name}} with System for system sequences', () => {
    const stops = getInstructStoppingSequences(
      baseInstruct({
        macro: false,
        systemSequence: '### {{name}}:',
        lastSystemSequence: 'X{{name}}',
      }),
      macroCtx,
    );
    expect(stops).toContain('### System:');
    expect(stops).toContain('XSystem');
  });

  it('omits sequences entirely when sequencesAsStopStrings is false (but keeps stopSequence)', () => {
    const stops = getInstructStoppingSequences(
      baseInstruct({
        sequencesAsStopStrings: false,
        stopSequence: '[STOP]',
        inputSequence: '<|turn>user\n',
        outputSequence: '<|turn>model\n',
      }),
      macroCtx,
    );
    expect(stops).toEqual(['[STOP]']);
    expect(stops).not.toContain('<|turn>user\n');
    expect(stops).not.toContain('<|turn>model\n');
  });

  it('handles empty macroCtx gracefully (substitutes with empty names)', () => {
    const stops = getInstructStoppingSequences(
      baseInstruct({
        macro: true,
        inputSequence: '### Input: {{user}}',
        outputSequence: '### Output: {{char}}',
      }),
      undefined,
    );
    expect(stops).toContain('### Input: ');
    expect(stops).toContain('### Output: ');
  });

  it('handles all sequence fields being set (first/last variants)', () => {
    const stops = getInstructStoppingSequences(
      baseInstruct({
        firstOutputSequence: 'FIRST_OUT',
        lastOutputSequence: 'LAST_OUT',
        firstInputSequence: 'FIRST_IN',
        lastInputSequence: 'LAST_IN',
        lastSystemSequence: 'LAST_SYS',
      }),
      macroCtx,
    );
    expect(stops).toContain('FIRST_OUT');
    expect(stops).toContain('LAST_OUT');
    expect(stops).toContain('FIRST_IN');
    expect(stops).toContain('LAST_IN');
    expect(stops).toContain('LAST_SYS');
  });
});

describe('trimStopStringTail', () => {
  it('returns text unchanged when stops is empty', () => {
    expect(trimStopStringTail('hello', [])).toBe('hello');
    expect(trimStopStringTail('hello', undefined)).toBe('hello');
    expect(trimStopStringTail('', ['stop'])).toBe('');
  });

  it('rmoves a full stop string at the tail', () => {
    expect(trimStopStringTail('hello<|turn>model\n', ['<|turn>model\n'])).toBe('hello');
  });

  it('removes a partial prefix of a stop string at the tail (single stop)', () => {
    expect(trimStopStringTail('hello<|turn>m', ['<|turn>model\n'])).toBe('hello');
    expect(trimStopStringTail('hello<|turn>mod', ['<|turn>model\n'])).toBe('hello');
  });

  it('removes the longest matching prefix when multiple stops could match', () => {
    const stops = ['ab', 'abcd'];
    expect(trimStopStringTail('helloabcd', stops)).toBe('hello');
    expect(trimStopStringTail('helloab', stops)).toBe('hello');
  });

  it('does not remove anything when no stop prefix matches the tail', () => {
    expect(trimStopStringTail('hello world', ['<|turn>model\n'])).toBe('hello world');
  });

  it('handles multiple stops in sequence (each potentially trimming)', () => {
    const stops = ['<turn|>\n', '<|turn>model\n'];
    expect(trimStopStringTail('hello<|turn>model\n<turn|>\n', stops)).toBe('hello');
  });

  it('ignores empty or whitespace-only stops', () => {
    expect(trimStopStringTail('hello', ['', '  '])).toBe('hello');
  });

  it('only trims from the tail, preserving content earlier in the string', () => {
    expect(trimStopStringTail('foo<|turn>model\nbar<|turn>m', ['<|turn>model\n'])).toBe(
      'foo<|turn>model\nbar',
    );
  });
});
