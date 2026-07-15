import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  CharacterDataSchema,
  CharacterBookSchema,
  CharacterBookEntrySchema,
  CharacterExtensionsSchema,
  DepthPromptSchema,
} from '@/shared/schemas/character';

const readFixture = (path: string) => JSON.parse(readFileSync(path, 'utf-8'));

describe('Character V2 parsing', () => {
  const fixture = readFixture('tests/fixtures/characters/v2.json');

  it('parses V2 character data', () => {
    const result = CharacterDataSchema.safeParse(fixture.data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Example Character');
      expect(result.data.tags).toEqual(['friendly', 'assistant', 'casual']);
      expect(result.data.alternate_greetings.length).toBe(3);
    }
  });

  it('parses character extensions', () => {
    const result = CharacterExtensionsSchema.safeParse(fixture.data.extensions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.talkativeness).toBe(0.7);
      expect(result.data.fav).toBe(true);
    }
  });
});

describe('Character V3 parsing', () => {
  const fixture = readFixture('tests/fixtures/characters/v3.json');

  it('parses V3 character data', () => {
    const result = CharacterDataSchema.safeParse(fixture.data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Advanced Character');
      expect(result.data.system_prompt).toBe(
        'You are a mystical librarian with centuries of knowledge.',
      );
    }
  });

  it('parses character book', () => {
    const book = fixture.data.character_book;
    const result = CharacterBookSchema.safeParse(book);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entries.length).toBe(2);
      expect(result.data.name).toBe('Magic World Info');
    }
  });

  it('parses character book entries', () => {
    const entry = fixture.data.character_book.entries[0];
    const result = CharacterBookEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('entry_001');
      expect(result.data.keys).toContain('magic');
      expect(result.data.selective).toBe(true);
    }
  });

  it('parses depth prompt from extensions', () => {
    const dp = fixture.data.extensions.depth_prompt;
    const result = DepthPromptSchema.safeParse(dp);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.depth).toBe(4);
      expect(result.data.role).toBe('system');
    }
  });

  it('preserves unknown extension fields', () => {
    const extWithUnknown = {
      talkativeness: 0.5,
      fav: true,
      world: 'magic_realm',
      custom_field: 'preserved',
      nested: { key: 'value' },
    };
    const result = CharacterExtensionsSchema.safeParse(extWithUnknown);
    expect(result.success).toBe(true);
    if (result.success) {
      const rawData = result.data as Record<string, unknown>;
      expect(rawData.custom_field).toBe('preserved');
    }
  });
});
