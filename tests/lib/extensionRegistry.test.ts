import { describe, it, expect, beforeEach } from 'bun:test';
import {
  registerPanel,
  unregisterPanel,
  getPanel,
  getPanelsByTarget,
  registerSlot,
  unregisterSlot,
  getSlotComponents,
  registerSlashCommand,
  unregisterSlashCommand,
  getSlashCommands,
  clearExtension,
  subscribeSlot,
  subscribePanelSet,
  type PanelConfig,
} from '../../src/lib/extensionRegistry';

const MockA = () => null;
const MockB = () => null;
const MockC = () => null;
const MockD = () => null;

function makePanel(id: string, overrides: Partial<PanelConfig> = {}): PanelConfig {
  return {
    id,
    target: 'center',
    component: MockA,
    extId: 'ext-test',
    ...overrides,
  };
}

describe('extensionRegistry', () => {
  beforeEach(() => {
    clearExtension('ext-a');
    clearExtension('ext-b');
    clearExtension('ext-c');
    clearExtension('ext-test');
    clearExtension('ext-test-2');
  });

  describe('panels', () => {
    it('registerPanel + getPanel returns the registered panel', () => {
      const cfg = makePanel('p1', { extId: 'ext-a' });
      registerPanel(cfg);
      expect(getPanel('p1')).toEqual(cfg);
    });

    it('getPanel returns undefined for unknown id', () => {
      expect(getPanel('nonexistent')).toBeUndefined();
    });

    it('registerPanel is idempotent — second overwrite wins', () => {
      const first = makePanel('p1', { extId: 'ext-a', loadingOrder: 10 });
      const second = makePanel('p1', { extId: 'ext-b', loadingOrder: 20 });
      registerPanel(first);
      registerPanel(second);
      expect(getPanel('p1')).toEqual(second);
    });

    it('unregisterPanel removes panel', () => {
      registerPanel(makePanel('p1', { extId: 'ext-a' }));
      unregisterPanel('p1');
      expect(getPanel('p1')).toBeUndefined();
    });

    it('unregisterPanel is idempotent', () => {
      registerPanel(makePanel('p1', { extId: 'ext-a' }));
      unregisterPanel('p1');
      unregisterPanel('p1');
      expect(getPanel('p1')).toBeUndefined();
    });

    it('getPanelsByTarget returns panels filtered and sorted by loadingOrder asc', () => {
      registerPanel(
        makePanel('p-center-1', { target: 'center', loadingOrder: 100, extId: 'ext-a' }),
      );
      registerPanel(
        makePanel('p-center-2', { target: 'center', loadingOrder: 50, extId: 'ext-a' }),
      );
      registerPanel(
        makePanel('p-drawer', { target: 'top-drawer', loadingOrder: 1, extId: 'ext-a' }),
      );

      const center = getPanelsByTarget('center');
      expect(center).toHaveLength(2);
      expect(center[0]!.id).toBe('p-center-2');
      expect(center[1]!.id).toBe('p-center-1');

      const drawer = getPanelsByTarget('top-drawer');
      expect(drawer).toHaveLength(1);
      expect(drawer[0]!.id).toBe('p-drawer');
    });

    it('getPanelsByTarget defaults loadingOrder to 100 when omitted', () => {
      registerPanel(makePanel('p1', { target: 'center', extId: 'ext-a' }));
      registerPanel(makePanel('p2', { target: 'center', loadingOrder: 50, extId: 'ext-a' }));

      const center = getPanelsByTarget('center');
      expect(center).toHaveLength(2);
      expect(center[0]!.id).toBe('p2');
      expect(center[1]!.id).toBe('p1');
    });
  });

  describe('slots', () => {
    it('registerSlot + getSlotComponents returns the entry', () => {
      registerSlot('slot-1', MockA, 'ext-a');
      const entries = getSlotComponents('slot-1');
      expect(entries).toHaveLength(1);
      expect(entries[0]!.component).toBe(MockA);
      expect(entries[0]!.extId).toBe('ext-a');
    });

    it('getSlotComponents returns empty array for unknown slot', () => {
      const entries = getSlotComponents('unknown');
      expect(entries).toHaveLength(0);
    });

    it('registerSlot dedupes by (slotId, component ref)', () => {
      registerSlot('slot-1', MockA, 'ext-a');
      registerSlot('slot-1', MockA, 'ext-b');
      const entries = getSlotComponents('slot-1');
      expect(entries).toHaveLength(1);
      expect(entries[0]!.extId).toBe('ext-a');
    });

    it('registerSlot allows different component refs in same slot', () => {
      registerSlot('slot-1', MockA, 'ext-a');
      registerSlot('slot-1', MockB, 'ext-b');
      const entries = getSlotComponents('slot-1');
      expect(entries).toHaveLength(2);
    });

    it('unregisterSlot removes matching component ref', () => {
      registerSlot('slot-1', MockA, 'ext-a');
      registerSlot('slot-1', MockB, 'ext-b');
      unregisterSlot('slot-1', MockA);
      const entries = getSlotComponents('slot-1');
      expect(entries).toHaveLength(1);
      expect(entries[0]!.component).toBe(MockB);
    });

    it('unregisterSlot is idempotent for non-existent component', () => {
      registerSlot('slot-1', MockA, 'ext-a');
      unregisterSlot('slot-1', MockB);
      expect(getSlotComponents('slot-1')).toHaveLength(1);
    });

    it('getSlotComponents returns stable array reference until contents change', () => {
      registerSlot('slot-1', MockA, 'ext-a');
      const arr1 = getSlotComponents('slot-1');
      const arr2 = getSlotComponents('slot-1');
      expect(arr1).toBe(arr2);

      registerSlot('slot-1', MockB, 'ext-b');
      const arr3 = getSlotComponents('slot-1');
      expect(arr1).not.toBe(arr3);
    });
  });

  describe('slash commands', () => {
    it('registerSlashCommand + getSlashCommands returns the command', () => {
      const handler = () => {};
      registerSlashCommand('foo', handler, 'ext-a', 'desc');
      const cmds = getSlashCommands();
      expect(cmds).toHaveLength(1);
      expect(cmds[0]!.name).toBe('foo');
      expect(cmds[0]!.handler).toBe(handler);
      expect(cmds[0]!.extId).toBe('ext-a');
      expect(cmds[0]!.description).toBe('desc');
    });

    it('getSlashCommands returns empty array when none registered', () => {
      expect(getSlashCommands()).toHaveLength(0);
    });

    it('registerSlashCommand overwrites existing by name', () => {
      const handler1 = () => {};
      const handler2 = () => {};
      registerSlashCommand('foo', handler1, 'ext-a');
      registerSlashCommand('foo', handler2, 'ext-b');
      const cmds = getSlashCommands();
      expect(cmds).toHaveLength(1);
      expect(cmds[0]!.handler).toBe(handler2);
      expect(cmds[0]!.extId).toBe('ext-b');
    });

    it('unregisterSlashCommand removes command', () => {
      registerSlashCommand('foo', () => {}, 'ext-a');
      unregisterSlashCommand('foo');
      expect(getSlashCommands()).toHaveLength(0);
    });

    it('unregisterSlashCommand is idempotent', () => {
      registerSlashCommand('foo', () => {}, 'ext-a');
      unregisterSlashCommand('foo');
      unregisterSlashCommand('foo');
      expect(getSlashCommands()).toHaveLength(0);
    });
  });

  describe('clearExtension', () => {
    it('removes all panels, slots, and commands for a given extId', () => {
      registerPanel(makePanel('p1', { extId: 'ext-a' }));
      registerPanel(makePanel('p2', { extId: 'ext-b' }));
      registerSlot('slot-1', MockA, 'ext-a');
      registerSlot('slot-1', MockB, 'ext-b');
      registerSlashCommand('foo', () => {}, 'ext-a');
      registerSlashCommand('bar', () => {}, 'ext-b');

      clearExtension('ext-a');

      expect(getPanel('p1')).toBeUndefined();
      expect(getPanel('p2')).toBeDefined();
      expect(getSlotComponents('slot-1')).toHaveLength(1);
      expect(getSlotComponents('slot-1')[0]!.extId).toBe('ext-b');
      expect(getSlashCommands()).toHaveLength(1);
      expect(getSlashCommands()[0]!.name).toBe('bar');
    });

    it('clearExtension with no matching extId is a no-op', () => {
      registerPanel(makePanel('p1', { extId: 'ext-a' }));
      clearExtension('ext-z');
      expect(getPanel('p1')).toBeDefined();
    });
  });

  describe('subscriptions', () => {
    it('subscribeSlot fires cb on slot change', () => {
      let callCount = 0;
      const unsub = subscribeSlot('slot-1', () => {
        callCount++;
      });

      registerSlot('slot-1', MockA, 'ext-a');
      expect(callCount).toBe(1);

      registerSlot('slot-1', MockB, 'ext-b');
      expect(callCount).toBe(2);

      unsub();
    });

    it('subscribeSlot unsub stops firing', () => {
      let callCount = 0;
      const unsub = subscribeSlot('slot-1', () => {
        callCount++;
      });

      registerSlot('slot-1', MockA, 'ext-a');
      expect(callCount).toBe(1);

      unsub();
      registerSlot('slot-1', MockB, 'ext-b');
      expect(callCount).toBe(1);
    });

    it('subscribeSlot unsub is idempotent', () => {
      const unsub = subscribeSlot('slot-1', () => {});
      unsub();
      unsub();
    });

    it('subscribePanelSet fires on registerPanel/unregisterPanel', () => {
      let callCount = 0;
      const unsub = subscribePanelSet(() => {
        callCount++;
      });

      registerPanel(makePanel('p1', { extId: 'ext-a' }));
      expect(callCount).toBe(1);

      unregisterPanel('p1');
      expect(callCount).toBe(2);

      unsub();
    });

    it('subscribePanelSet unsub stops firing', () => {
      let callCount = 0;
      const unsub = subscribePanelSet(() => {
        callCount++;
      });

      registerPanel(makePanel('p1', { extId: 'ext-a' }));
      expect(callCount).toBe(1);

      unsub();
      unregisterPanel('p1');
      expect(callCount).toBe(1);
    });

    it('clearExtension notifies slot listeners for affected slots', () => {
      let callCount = 0;
      const unsub = subscribeSlot('slot-1', () => {
        callCount++;
      });

      registerSlot('slot-1', MockA, 'ext-a');
      expect(callCount).toBe(1);

      clearExtension('ext-a');
      expect(callCount).toBe(2);

      unsub();
    });

    it('clearExtension notifies panel listeners', () => {
      let callCount = 0;
      const unsub = subscribePanelSet(() => {
        callCount++;
      });

      registerPanel(makePanel('p1', { extId: 'ext-a' }));
      expect(callCount).toBe(1);

      clearExtension('ext-a');
      expect(callCount).toBe(2);

      unsub();
    });
  });

  describe('adjacent-surface', () => {
    it('importing extensionRegistry does not break the test file', () => {
      expect(typeof registerPanel).toBe('function');
      expect(typeof getPanel).toBe('function');
      expect(typeof getPanelsByTarget).toBe('function');
      expect(typeof registerSlot).toBe('function');
      expect(typeof getSlotComponents).toBe('function');
      expect(typeof registerSlashCommand).toBe('function');
      expect(typeof getSlashCommands).toBe('function');
      expect(typeof clearExtension).toBe('function');
      expect(typeof subscribeSlot).toBe('function');
      expect(typeof subscribePanelSet).toBe('function');
    });
  });
});
