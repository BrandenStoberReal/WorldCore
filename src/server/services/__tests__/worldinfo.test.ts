import { describe, it, expect, afterEach } from 'bun:test';
import { worldInfoService } from '@/server/services/worldinfo.service';
import type { WorldInfoEntry } from '@/shared/types/worldinfo';

describe('WorldInfoService', () => {
  const createdFileIds: number[] = [];

  const makeEntry = (uid: string, key: string): WorldInfoEntry => ({
    uid,
    key,
    keysecondary: ['alt'],
    comment: '',
    content: `Content for ${key}`,
    constant: false,
    vectorized: false,
    selective: false,
    selectiveLogic: 0,
    addMemo: false,
    order: 0,
    position: 0,
    disable: false,
    excludeRecursion: false,
    preventRecursion: false,
    delayUntilRecursion: false,
    probability: 1,
    useProbability: false,
    depth: 0,
    group: 0,
    groupOverride: false,
    groupWeight: 1,
    scanDepth: 0,
    caseSensitive: false,
    matchWholeWords: false,
    automationId: '',
    role: '',
    sticky: false,
    cooldown: 0,
    delay: 0,
    matchPersonaDescription: false,
    matchCharacterDescription: false,
    matchCharacterPersonality: false,
    matchCharacterDepthPrompt: false,
    matchScenario: false,
    matchCreatorNotes: false,
    triggers: '',
    ignoreBudget: false,
  });

  const createWorldInfo = async (name: string, entries: WorldInfoEntry[]): Promise<number> => {
    const fileId = await worldInfoService.create(name, entries);
    createdFileIds.push(fileId);
    return fileId;
  };

  afterEach(async () => {
    for (const id of createdFileIds) {
      try {
        await worldInfoService.delete(id);
      } catch {
        // Already deleted
      }
    }
    createdFileIds.length = 0;
  });

  it('create returns a file id', async () => {
    const entries = [makeEntry('e1', 'key1'), makeEntry('e2', 'key2')];
    const fileId = await createWorldInfo('Test World Info', entries);
    expect(fileId).toBeGreaterThan(0);
  });

  it('get returns the created world info', async () => {
    const testName = 'Test Get WI';
    const entries = [makeEntry('e1', 'key1'), makeEntry('e2', 'key2')];
    const fileId = await createWorldInfo(testName, entries);
    const wi = await worldInfoService.get(fileId);
    expect(wi).not.toBeNull();
    expect(wi!.name).toBe(testName);
    expect(Object.keys(wi!.entries).length).toBe(2);
    expect(wi!.entries['e1']?.key).toBe('key1');
  });

  it('get returns null for non-existent file', async () => {
    const wi = await worldInfoService.get(999999);
    expect(wi).toBeNull();
  });

  it('getAll includes the created world info', async () => {
    const testName = 'Test GetAll WI';
    const entries = [makeEntry('e1', 'key1'), makeEntry('e2', 'key2')];
    const fileId = await createWorldInfo(testName, entries);
    const all = await worldInfoService.getAll();
    const found = all.find((w) => w.id === fileId);
    expect(found).toBeDefined();
    expect(found!.name).toBe(testName);
    expect(found!.entryCount).toBe(2);
  });

  it('addEntry adds a new entry', async () => {
    const testName = 'Test AddEntry WI';
    const entries = [makeEntry('e1', 'key1')];
    const fileId = await createWorldInfo(testName, entries);
    await worldInfoService.addEntry(fileId, makeEntry('e3', 'key3'));
    const wi = await worldInfoService.get(fileId);
    expect(wi!.entries['e3']?.key).toBe('key3');
  });

  it('addEntry throws on duplicate uid', async () => {
    const testName = 'Test AddEntryDup WI';
    const entries = [makeEntry('e1', 'key1')];
    const fileId = await createWorldInfo(testName, entries);
    await expect(worldInfoService.addEntry(fileId, makeEntry('e1', 'dup'))).rejects.toThrow();
  });

  it('updateEntry modifies an existing entry', async () => {
    const testName = 'Test UpdateEntry WI';
    const entries = [makeEntry('e1', 'key1')];
    const fileId = await createWorldInfo(testName, entries);
    const updatedEntry = makeEntry('e1', 'updated_key1');
    updatedEntry.content = 'Updated content';
    await worldInfoService.updateEntry(fileId, 'e1', updatedEntry);
    const wi = await worldInfoService.get(fileId);
    expect(wi!.entries['e1']?.key).toBe('updated_key1');
    expect(wi!.entries['e1']?.content).toBe('Updated content');
  });

  it('updateEntry throws for non-existent uid', async () => {
    const testName = 'Test UpdateEntryNE WI';
    const entries = [makeEntry('e1', 'key1')];
    const fileId = await createWorldInfo(testName, entries);
    await expect(
      worldInfoService.updateEntry(fileId, 'nonexistent', makeEntry('x', 'x')),
    ).rejects.toThrow();
  });

  it('deleteEntry removes an entry', async () => {
    const testName = 'Test DeleteEntry WI';
    const entries = [makeEntry('e1', 'key1'), makeEntry('e3', 'key3')];
    const fileId = await createWorldInfo(testName, entries);
    await worldInfoService.deleteEntry(fileId, 'e3');
    const wi = await worldInfoService.get(fileId);
    expect(wi!.entries['e3']).toBeUndefined();
  });

  it('deleteEntry throws for non-existent uid', async () => {
    const testName = 'Test DeleteEntryNE WI';
    const entries = [makeEntry('e1', 'key1')];
    const fileId = await createWorldInfo(testName, entries);
    await expect(worldInfoService.deleteEntry(fileId, 'e3')).rejects.toThrow();
  });

  it('update modifies world info name', async () => {
    const testName = 'Test UpdateName WI';
    const entries = [makeEntry('e1', 'key1')];
    const fileId = await createWorldInfo(testName, entries);
    await worldInfoService.update(fileId, { name: 'Updated Name' });
    const wi = await worldInfoService.get(fileId);
    expect(wi!.name).toBe('Updated Name');
  });

  it('delete removes the world info', async () => {
    const testName = 'Test Delete WI';
    const entries = [makeEntry('e1', 'key1')];
    const fileId = await worldInfoService.create(testName, entries); // Don't track - we're testing delete
    await worldInfoService.delete(fileId);
    const wi = await worldInfoService.get(fileId);
    expect(wi).toBeNull();
  });

  it('delete throws for non-existent file', async () => {
    await expect(worldInfoService.delete(999999)).rejects.toThrow();
  });
});
