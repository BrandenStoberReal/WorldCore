import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import type { FC } from 'react';
import {
  getPanelsByTarget,
  getSlotComponents,
  subscribePanelSet,
  subscribeSlot,
  type PanelConfig,
  type SlotEntry,
} from '@/lib/extensionRegistry';
import { getRegisteredSettingsPanels, subscribeSettingsPanelChanges } from '@/lib/worldcoreApi';
import type { WorldCorePanelTarget, WorldCoreSlotId } from '@/shared/types/worldcore-api';

const emptyPanels: PanelConfig[] = [];
const emptySlots: SlotEntry[] = [];

function subscribePanel(target: WorldCorePanelTarget, cb: () => void): () => void {
  return subscribePanelSet(() => {
    cb();
  });
}

function getPanelSnapshot(target: WorldCorePanelTarget): PanelConfig[] {
  const panels = getPanelsByTarget(target);
  return panels.length === 0 ? emptyPanels : (Object.freeze([...panels]) as PanelConfig[]);
}

function subscribeSlotForId(slotId: WorldCoreSlotId, cb: () => void): () => void {
  return subscribeSlot(slotId, cb);
}

function getSlotSnapshot(slotId: WorldCoreSlotId): SlotEntry[] {
  const entries = getSlotComponents(slotId);
  return entries.length === 0 ? emptySlots : entries;
}

export function useRegisteredPanels(target: WorldCorePanelTarget): PanelConfig[] {
  return useSyncExternalStore(
    (cb) => subscribePanel(target, cb),
    () => getPanelSnapshot(target),
    () => emptyPanels,
  );
}

export function useSlotComponents(slotId: WorldCoreSlotId): SlotEntry[] {
  return useSyncExternalStore(
    (cb) => subscribeSlotForId(slotId, cb),
    () => getSlotSnapshot(slotId),
    () => emptySlots,
  );
}

export function useExtensionSettingsPanels(): { extId: string; component: FC }[] {
  return useSyncExternalStore(
    subscribeSettingsPanelChanges,
    () => getRegisteredSettingsPanels(),
    () => [],
  );
}

function SafeSlotRenderer({ entry }: { entry: SlotEntry }) {
  const C = entry.component;
  useEffect(() => {
    return () => {
      // no-op; the registry is responsible for unregister via api.unregisterSlot.
    };
  }, []);
  try {
    return <C />;
  } catch (err) {
    console.error(`[worldcore-ext] slot render error from "${entry.extId}":`, err);
    return null;
  }
}

export function ExtensionSlot({
  slotId,
  fallback = null,
}: {
  slotId: WorldCoreSlotId;
  fallback?: ReactNode;
}): ReactNode {
  const entries = useSlotComponents(slotId);
  if (entries.length === 0) return fallback;
  return (
    <>
      {entries.map((entry, idx) => (
        <SafeSlotRenderer key={`${entry.extId}-${idx}`} entry={entry} />
      ))}
    </>
  );
}

export function ExtensionPanelSlot({ target }: { target: WorldCorePanelTarget }): ReactNode {
  const panels = useRegisteredPanels(target);
  if (panels.length === 0) return null;
  return (
    <>
      {panels.map((cfg) => {
        const C = cfg.component;
        try {
          return <C key={cfg.id} />;
        } catch (err) {
          console.error(`[worldcore-ext] panel render error from "${cfg.extId}":`, err);
          return null;
        }
      })}
    </>
  );
}
