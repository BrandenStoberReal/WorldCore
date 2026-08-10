import type { FC, ReactNode } from 'react';
import { clearCardSourcesForExtId } from './cardSourceRegistry';
import { clearGenerationInterceptorsForExtId } from './generationInterceptorRegistry';
import { clearExtListeners } from './extensionEventBus';

export interface PanelConfig {
  id: string;
  target: 'top-drawer' | 'center';
  component: FC;
  navIcon?: ReactNode;
  navLabel?: string;
  loadingOrder?: number;
  extId: string;
}

export interface SlotEntry {
  component: FC;
  extId: string;
}

export interface SlashCommandEntry {
  name: string;
  handler: (args: string) => void;
  extId: string;
  description?: string;
}

const panelsById = new Map<string, PanelConfig>();
const slotsBySlotId = new Map<string, SlotEntry[]>();
const slashCommands = new Map<string, SlashCommandEntry>();
const slotListeners = new Map<string, Set<() => void>>();
const slotSnapshotCache = new Map<string, SlotEntry[]>();
const panelListeners = new Set<() => void>();

export function subscribePanelSet(cb: () => void): () => void {
  panelListeners.add(cb);
  return () => {
    panelListeners.delete(cb);
  };
}

function notifyPanelChange(): void {
  for (const cb of panelListeners) cb();
}

export function registerPanel(cfg: PanelConfig): void {
  panelsById.set(cfg.id, cfg);
  notifyPanelChange();
}

export function unregisterPanel(id: string): void {
  panelsById.delete(id);
  notifyPanelChange();
}

export function getPanel(id: string): PanelConfig | undefined {
  return panelsById.get(id);
}

export function getPanelsByTarget(target: 'top-drawer' | 'center'): PanelConfig[] {
  const result: PanelConfig[] = [];
  for (const cfg of panelsById.values()) {
    if (cfg.target === target) result.push(cfg);
  }
  result.sort((a, b) => (a.loadingOrder ?? 100) - (b.loadingOrder ?? 100));
  return result;
}

export function registerSlot(slotId: string, component: FC, extId: string): void {
  const current = slotsBySlotId.get(slotId) ?? [];
  if (current.some((e) => e.component === component)) return;
  const updated = [...current, { component, extId }];
  slotsBySlotId.set(slotId, updated);
  slotSnapshotCache.delete(slotId);
  notifySlotChange(slotId);
}

export function unregisterSlot(slotId: string, component: FC): void {
  const current = slotsBySlotId.get(slotId);
  if (!current) return;
  const filtered = current.filter((e) => e.component !== component);
  if (filtered.length === current.length) return;
  slotsBySlotId.set(slotId, filtered);
  slotSnapshotCache.delete(slotId);
  notifySlotChange(slotId);
}

export function getSlotComponents(slotId: string): SlotEntry[] {
  const live = slotsBySlotId.get(slotId) ?? [];
  const cached = slotSnapshotCache.get(slotId);
  if (cached && cached.length === live.length && cached.every((entry, i) => entry === live[i])) {
    return cached;
  }
  const snapshot: SlotEntry[] = Object.freeze([...live]) as SlotEntry[];
  slotSnapshotCache.set(slotId, snapshot);
  return snapshot;
}

export function registerSlashCommand(
  name: string,
  handler: (args: string) => void,
  extId: string,
  description?: string,
): void {
  slashCommands.set(name, { name, handler, extId, description });
}

export function unregisterSlashCommand(name: string): void {
  slashCommands.delete(name);
}

export function getSlashCommands(): SlashCommandEntry[] {
  return [...slashCommands.values()];
}

export function clearExtension(extId: string): void {
  for (const [id, cfg] of panelsById) {
    if (cfg.extId === extId) panelsById.delete(id);
  }
  notifyPanelChange();

  const affectedSlots: string[] = [];
  for (const [slotId, entries] of slotsBySlotId) {
    const filtered = entries.filter((e) => e.extId !== extId);
    if (filtered.length !== entries.length) {
      slotsBySlotId.set(slotId, filtered);
      slotSnapshotCache.delete(slotId);
      affectedSlots.push(slotId);
    }
  }

  for (const [name, entry] of slashCommands) {
    if (entry.extId === extId) slashCommands.delete(name);
  }

  for (const slotId of affectedSlots) {
    notifySlotChange(slotId);
  }

  clearCardSourcesForExtId(extId);
  clearGenerationInterceptorsForExtId(extId);
  clearExtListeners(extId);
}

export function subscribeSlot(slotId: string, cb: () => void): () => void {
  let set = slotListeners.get(slotId);
  if (!set) {
    set = new Set();
    slotListeners.set(slotId, set);
  }
  set.add(cb);
  return () => {
    set!.delete(cb);
  };
}

function notifySlotChange(slotId: string): void {
  const set = slotListeners.get(slotId);
  if (set) {
    for (const cb of set) cb();
  }
}
