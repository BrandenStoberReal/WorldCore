import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { WorldInfoSchema, WorldInfoEntrySchema } from '@/shared/schemas/worldinfo';

const readFixture = (path: string) => JSON.parse(readFileSync(path, 'utf-8'));

describe('WorldInfoEntry parsing', () => {
  it('parses valid world info entry', () => {
    const fixture = readFixture('tests/fixtures/worlds/sample.json');
    const entry = fixture.entries['entry_001'];

    const result = WorldInfoEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.uid).toBe('entry_001');
      expect(result.data.key).toBe('magic');
      expect(result.data.keysecondary).toContain('spell');
      expect(result.data.vectorized).toBe(true);
      expect(result.data.selective).toBe(true);
      expect(result.data.matchCharacterDescription).toBe(true);
      expect(result.data.matchScenario).toBe(true);
    }
  });

  it('parses constant entry', () => {
    const fixture = readFixture('tests/fixtures/worlds/sample.json');
    const entry = fixture.entries['entry_002'];

    const result = WorldInfoEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.constant).toBe(true);
      expect(result.data.sticky).toBe(true);
      expect(result.data.position).toBe(2);
    }
  });
});

describe('WorldInfo parsing', () => {
  it('parses full world info fixture', () => {
    const fixture = readFixture('tests/fixtures/worlds/sample.json');

    const result = WorldInfoSchema.safeParse(fixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Fantasy World');
      expect(Object.keys(result.data.entries).length).toBe(2);
      expect(result.data.entries['entry_001']?.key).toBe('magic');
    }
  });

  it('preserves unknown extension fields', () => {
    const fixture = readFixture('tests/fixtures/worlds/sample.json');
    const entry = { ...fixture.entries['entry_001'], custom_field: 'value' };

    const result = WorldInfoEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
  });
});
