import { describe, it, expect } from 'bun:test';
import { CardListingSchema, CardSearchOptionsSchema } from '../../src/shared/schemas/character';

/* ------------------------------------------------------------------ */
/*  CardListingSchema                                                 */
/* ------------------------------------------------------------------ */

describe('CardListingSchema', () => {
  describe('valid inputs', () => {
    it('accepts a minimal valid object with defaults applied', () => {
      const result = CardListingSchema.safeParse({
        sourceId: 's1',
        cardId: 'c1',
        name: 'Card',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceId).toBe('s1');
        expect(result.data.cardId).toBe('c1');
        expect(result.data.name).toBe('Card');
        expect(result.data.tags).toEqual([]);
        expect(result.data.payload).toBeUndefined();
        expect(result.data.description).toBeUndefined();
        expect(result.data.avatarUrl).toBeUndefined();
        expect(result.data.creator).toBeUndefined();
      }
    });

    it('accepts a full object with all optional fields populated', () => {
      const result = CardListingSchema.safeParse({
        sourceId: 's1',
        cardId: 'c1',
        name: 'Full Card',
        description: 'A detailed card',
        avatarUrl: 'https://example.com/a.png',
        creator: 'TestCreator',
        tags: ['fantasy', 'npc'],
        payload: { id: 42 },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('A detailed card');
        expect(result.data.avatarUrl).toBe('https://example.com/a.png');
        expect(result.data.creator).toBe('TestCreator');
        expect(result.data.tags).toEqual(['fantasy', 'npc']);
        expect(result.data.payload).toEqual({ id: 42 });
      }
    });

    it('accepts missing avatarUrl (optional)', () => {
      const result = CardListingSchema.safeParse({
        sourceId: 's1',
        cardId: 'c1',
        name: 'No Avatar',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.avatarUrl).toBeUndefined();
      }
    });

    it('accepts empty tags array explicitly', () => {
      const result = CardListingSchema.safeParse({
        sourceId: 's1',
        cardId: 'c1',
        name: 'Tagged',
        tags: [],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tags).toEqual([]);
      }
    });
  });

  describe('rejections', () => {
    it('rejects empty sourceId', () => {
      const result = CardListingSchema.safeParse({
        sourceId: '',
        cardId: 'c1',
        name: 'N',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty cardId', () => {
      const result = CardListingSchema.safeParse({
        sourceId: 's1',
        cardId: '',
        name: 'N',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty name', () => {
      const result = CardListingSchema.safeParse({
        sourceId: 's1',
        cardId: 'c1',
        name: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects a non-URL avatarUrl', () => {
      const result = CardListingSchema.safeParse({
        sourceId: 's1',
        cardId: 'c1',
        name: 'N',
        avatarUrl: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing required sourceId', () => {
      const result = CardListingSchema.safeParse({
        cardId: 'c1',
        name: 'N',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing required cardId', () => {
      const result = CardListingSchema.safeParse({
        sourceId: 's1',
        name: 'N',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing required name', () => {
      const result = CardListingSchema.safeParse({
        sourceId: 's1',
        cardId: 'c1',
      });
      expect(result.success).toBe(false);
    });
  });
});

/* ------------------------------------------------------------------ */
/*  CardSearchOptionsSchema                                           */
/* ------------------------------------------------------------------ */

describe('CardSearchOptionsSchema', () => {
  describe('valid inputs', () => {
    it('accepts an empty object', () => {
      const result = CardSearchOptionsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });

    it('accepts cursor and limit', () => {
      const result = CardSearchOptionsSchema.safeParse({
        cursor: 'abc',
        limit: 50,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cursor).toBe('abc');
        expect(result.data.limit).toBe(50);
      }
    });

    it('accepts only cursor', () => {
      const result = CardSearchOptionsSchema.safeParse({ cursor: 'next' });
      expect(result.success).toBe(true);
    });

    it('accepts only limit', () => {
      const result = CardSearchOptionsSchema.safeParse({ limit: 10 });
      expect(result.success).toBe(true);
    });
  });

  describe('rejections', () => {
    it('rejects zero limit', () => {
      const result = CardSearchOptionsSchema.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects negative limit', () => {
      const result = CardSearchOptionsSchema.safeParse({ limit: -5 });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer limit', () => {
      const result = CardSearchOptionsSchema.safeParse({ limit: 1.5 });
      expect(result.success).toBe(false);
    });
  });
});
