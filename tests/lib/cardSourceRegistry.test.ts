import { describe, it, expect, beforeEach } from 'bun:test';
import {
  registerCardSource,
  unregisterCardSource,
  getCardSource,
  getAllCardSources,
  clearCardSourcesForExtId,
  subscribeCardSources,
  clearAllCardSources,
} from '../../src/lib/cardSourceRegistry';
import { clearExtension } from '../../src/lib/extensionRegistry';
import type { CardSource } from '../../src/shared/types/character';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function makeSource(overrides: Partial<CardSource> = {}): CardSource {
  return {
    id: 'src-a',
    label: 'A',
    fetchCard: () => Promise.resolve(new ArrayBuffer(0)),
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('cardSourceRegistry', () => {
  beforeEach(() => {
    clearAllCardSources();
  });

  describe('register + get', () => {
    it('registerCardSource stores source retrievable by id', () => {
      const source = makeSource({ id: 'src-a', label: 'A' });
      registerCardSource(source, 'ext-a');
      expect(getCardSource('src-a')).toBe(source);
    });

    it('registerCardSource is idempotent by source.id — second registration wins', () => {
      const first = makeSource({ id: 'src-a', label: 'First' });
      const second = makeSource({ id: 'src-a', label: 'Second' });
      registerCardSource(first, 'ext-a');
      registerCardSource(second, 'ext-a');
      expect(getCardSource('src-a')?.label).toBe('Second');
    });

    it('getCardSource returns undefined for unknown id', () => {
      expect(getCardSource('nonexistent')).toBeUndefined();
    });
  });

  describe('validation', () => {
    it('registerCardSource throws on empty source.id', () => {
      const source = makeSource({ id: '' });
      expect(() => registerCardSource(source, 'ext-a')).toThrow('non-empty');
    });

    it('registerCardSource throws on whitespace-only source.id', () => {
      const source = makeSource({ id: '   ' });
      expect(() => registerCardSource(source, 'ext-a')).toThrow('non-empty');
    });

    it('registerCardSource throws when fetchCard is not a function', () => {
      const source = makeSource();
      delete (source as { fetchCard?: CardSource['fetchCard'] }).fetchCard;
      expect(() => registerCardSource(source, 'ext-a')).toThrow('function');
    });
  });

  describe('unregister', () => {
    it('unregisterCardSource removes by id', () => {
      registerCardSource(makeSource({ id: 'src-a' }), 'ext-a');
      unregisterCardSource('src-a');
      expect(getCardSource('src-a')).toBeUndefined();
      expect(getAllCardSources()).toHaveLength(0);
    });

    it('unregisterCardSource is no-op for missing id', () => {
      unregisterCardSource('nonexistent');
      expect(getAllCardSources()).toHaveLength(0);
    });
  });

  describe('getAllCardSources', () => {
    it('returns a defensive copy (reference-different on each call)', () => {
      registerCardSource(makeSource({ id: 'src-a' }), 'ext-a');
      registerCardSource(makeSource({ id: 'src-b' }), 'ext-a');
      const arr1 = getAllCardSources();
      const arr2 = getAllCardSources();
      expect(arr1).not.toBe(arr2);
      expect(arr1.map((s) => s.id)).toEqual(['src-a', 'src-b']);
      expect(arr2.map((s) => s.id)).toEqual(['src-a', 'src-b']);
    });
  });

  describe('clearCardSourcesForExtId', () => {
    it('removes only sources matching the given extId', () => {
      registerCardSource(makeSource({ id: 'src-1' }), 'ext-a');
      registerCardSource(makeSource({ id: 'src-2' }), 'ext-a');
      registerCardSource(makeSource({ id: 'src-3' }), 'ext-b');

      const removed = clearCardSourcesForExtId('ext-a');
      expect(removed).toBe(2);
      expect(getAllCardSources()).toHaveLength(1);
      expect(getCardSource('src-1')).toBeUndefined();
      expect(getCardSource('src-2')).toBeUndefined();
      expect(getCardSource('src-3')).toBeDefined();
    });

    it('returns 0 and does not notify when nothing matches', () => {
      registerCardSource(makeSource({ id: 'src-1' }), 'ext-a');
      let callCount = 0;
      subscribeCardSources(() => {
        callCount++;
      });

      const removed = clearCardSourcesForExtId('ext-z');
      expect(removed).toBe(0);
      expect(getAllCardSources()).toHaveLength(1);
      expect(callCount).toBe(0);
    });

    it('auto-notifies subscribers when sources are removed', () => {
      registerCardSource(makeSource({ id: 'src-1' }), 'ext-a');
      let notified = false;
      subscribeCardSources(() => {
        notified = true;
      });
      clearCardSourcesForExtId('ext-a');
      expect(notified).toBe(true);
    });
  });

  describe('subscriptions', () => {
    it('subscribeCardSources fires on register and unregister', () => {
      let callCount = 0;
      const unsub = subscribeCardSources(() => {
        callCount++;
      });

      registerCardSource(makeSource({ id: 'src-a' }), 'ext-a');
      expect(callCount).toBe(1);

      unregisterCardSource('src-a');
      expect(callCount).toBe(2);

      unsub();
    });

    it('subscribeCardSources fires on clearCardSourcesForExtId', () => {
      registerCardSource(makeSource({ id: 'src-a' }), 'ext-a');
      let callCount = 0;
      const unsub = subscribeCardSources(() => {
        callCount++;
      });

      clearCardSourcesForExtId('ext-a');
      expect(callCount).toBe(1);

      unsub();
    });

    it('subscribeCardSources returns an unsubscribe function that stops notifications', () => {
      let callCount = 0;
      const unsub = subscribeCardSources(() => {
        callCount++;
      });

      registerCardSource(makeSource({ id: 'src-a' }), 'ext-a');
      expect(callCount).toBe(1);

      unsub();
      registerCardSource(makeSource({ id: 'src-b' }), 'ext-a');
      expect(callCount).toBe(1);
    });
  });

  describe('cross-registry teardown', () => {
    it('extensionRegistry.clearExtension cascades to remove card sources', () => {
      registerCardSource(makeSource({ id: 'src-x' }), 'ext-x');
      expect(getCardSource('src-x')).toBeDefined();

      clearExtension('ext-x');
      expect(getCardSource('src-x')).toBeUndefined();
      expect(getAllCardSources()).toHaveLength(0);
    });

    it('extensionRegistry.clearExtension for unknown extId does not throw', () => {
      registerCardSource(makeSource({ id: 'src-a' }), 'ext-a');
      expect(() => clearExtension('ext-z')).not.toThrow();
      expect(getCardSource('src-a')).toBeDefined();
    });
  });
});
