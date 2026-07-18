import { describe, it, expect, afterEach } from 'bun:test';
import { characterService } from '@/server/services/character.service';
import type { CharacterCreateInput } from '@/shared/types/character';
import { db } from '@/server/db/client';
import { characters, chats } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { getUserCharacterPath, DATA_ROOT } from '@/server/storage/paths';
import { existsSync } from '@/server/storage/fs';
import { NotFoundError } from '@/server/errors';
import path from 'node:path';
import fsSync from 'node:fs';

const TEST_USER = 'default-user';

const baseInput = (name: string): CharacterCreateInput => ({
  name,
  description: '',
  personality: '',
  scenario: '',
  first_mes: '',
  mes_example: '',
  creator_notes: '',
  system_prompt: '',
  post_history_instructions: '',
  tags: [],
  creator: '',
  character_version: '',
  alternate_greetings: [],
  source: [],
  group_only_greetings: [],
  assets: [],
});

describe('CharacterService', () => {
  const createdIds: number[] = [];

  const createCharacter = async (input: CharacterCreateInput, userId = TEST_USER) => {
    const created = await characterService.create(input, userId);
    createdIds.push(created.id);
    return created;
  };

  afterEach(async () => {
    for (const id of createdIds) {
      try {
        // Try both users for cleanup since we have cross-user tests
        await characterService.delete(id, TEST_USER);
      } catch {
        try {
          await characterService.delete(id, 'user-A');
        } catch {
          try {
            await characterService.delete(id, 'user-B');
          } catch {
            // Already deleted
          }
        }
      }
    }
    createdIds.length = 0;
    // Clean up test user directories (NOT default-user)
    for (const uid of ['user-A', 'user-B']) {
      const dir = path.join(DATA_ROOT, uid);
      if (fsSync.existsSync(dir)) {
        fsSync.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it('create a character and get it back by ID', async () => {
    const created = await createCharacter(baseInput('TestChar_Svc'));

    expect(created.name).toBe('TestChar_Svc');
    expect(created.id).toBeGreaterThan(0);

    const fetched = await characterService.get(created.id, TEST_USER);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe('TestChar_Svc');
  });

  it('rename updates name', async () => {
    const created = await createCharacter(baseInput('RenameMe_Svc'));

    await characterService.rename(created.id, TEST_USER, 'RenamedChar_Svc');
    const fetched = await characterService.get(created.id, TEST_USER);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe('RenamedChar_Svc');
  });

  it('edit updates fields', async () => {
    const created = await createCharacter({ ...baseInput('EditMe_Svc'), description: 'Original' });

    await characterService.edit(created.id, TEST_USER, { description: 'Updated description' });
    const fetched = await characterService.get(created.id, TEST_USER);
    expect(fetched).not.toBeNull();
    expect(fetched!.description).toBe('Updated description');
  });

  it('delete removes character', async () => {
    const created = await characterService.create(baseInput('DeleteMe_Svc'), TEST_USER);

    await characterService.delete(created.id, TEST_USER);
    const fetched = await characterService.get(created.id, TEST_USER);
    expect(fetched).toBeNull();
  });

  it('getAll returns list containing character', async () => {
    await createCharacter(baseInput('ListMe_Svc'));

    const all = await characterService.getAll(TEST_USER);
    const found = (all as Array<{ name: string }>).find((c) => c.name === 'ListMe_Svc');
    expect(found).not.toBeNull();
  });

  it('duplicate creates new character with same data', async () => {
    const created = await createCharacter({
      ...baseInput('DupSource_Svc'),
      description: 'To duplicate',
      personality: 'Nice',
    });

    const newId = await characterService.duplicate(created.id, TEST_USER);
    createdIds.push(newId);
    expect(newId).not.toBe(created.id);

    const dup = await characterService.get(newId, TEST_USER);
    expect(dup).not.toBeNull();
    expect(dup!.name).toBe('DupSource_Svc (copy)');
    expect(dup!.description).toBe('To duplicate');
    expect(dup!.personality).toBe('Nice');
  });

  // ─── Cross-user isolation tests ────────────────────────────────────────

  it('cross-user isolation: get returns null for wrong userId', async () => {
    const created = await createCharacter(baseInput('IsoGet'), 'user-A');

    const wrongUser = await characterService.get(created.id, 'user-B');
    expect(wrongUser).toBeNull();

    const rightUser = await characterService.get(created.id, 'user-A');
    expect(rightUser).not.toBeNull();
    expect(rightUser!.name).toBe('IsoGet');
  });

  it('cross-user isolation: getAll scopes by userId', async () => {
    await createCharacter(baseInput('IsoAll_A1'), 'user-A');
    await createCharacter(baseInput('IsoAll_A2'), 'user-A');
    await createCharacter(baseInput('IsoAll_B1'), 'user-B');

    const aChars = await characterService.getAll('user-A');
    const bChars = await characterService.getAll('user-B');

    expect(aChars).toHaveLength(2);
    expect(bChars).toHaveLength(1);
    expect(bChars[0]!).toHaveProperty('name', 'IsoAll_B1');
  });

  it('FS writes land in data/<userId>/characters/', async () => {
    const created = await createCharacter(baseInput('FsPathTest'), 'user-A');

    const expectedPath = path.join(getUserCharacterPath('user-A'), created.avatar);
    expect(existsSync(expectedPath)).toBe(true);

    const wrongPath = path.join(getUserCharacterPath('default-user'), created.avatar);
    expect(existsSync(wrongPath)).toBe(false);
  });

  it('inserts set userId column on the DB row', async () => {
    const created = await createCharacter(baseInput('UserIdCol'), 'user-A');

    const rows = await db.select().from(characters).where(eq(characters.id, created.id)).limit(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.userId).toBe('user-A');
  });

  it('edit scoped by userId: wrong userId is a no-op (NotFoundError)', async () => {
    const created = await createCharacter(
      { ...baseInput('IsoEdit'), description: 'original' },
      'user-A',
    );

    // edit as user-B should throw NotFoundError (no row matches)
    await expect(
      characterService.edit(created.id, 'user-B', { description: 'hacked' }),
    ).rejects.toThrow(NotFoundError);

    // verify original data unchanged
    const fetched = await characterService.get(created.id, 'user-A');
    expect(fetched).not.toBeNull();
    expect(fetched!.description).toBe('original');
  });

  it('delete scoped by userId: wrong userId throws, original remains', async () => {
    const created = await createCharacter(baseInput('IsoDelete'), 'user-A');

    // delete as user-B should throw
    await expect(characterService.delete(created.id, 'user-B')).rejects.toThrow(NotFoundError);

    // verify still exists
    const still = await characterService.get(created.id, 'user-A');
    expect(still).not.toBeNull();
    expect(still!.name).toBe('IsoDelete');

    // delete as user-A should succeed
    await characterService.delete(created.id, 'user-A');
    const gone = await characterService.get(created.id, 'user-A');
    expect(gone).toBeNull();
  });

  it('duplicate scopes by userId: new row has correct userId and FS path', async () => {
    const created = await createCharacter(baseInput('IsoDup'), 'user-A');

    const newId = await characterService.duplicate(created.id, 'user-A');
    createdIds.push(newId);

    // DB row userId
    const rows = await db.select().from(characters).where(eq(characters.id, newId)).limit(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.userId).toBe('user-A');

    // FS path
    const expectedPath = path.join(getUserCharacterPath('user-A'), rows[0]!.avatar);
    expect(existsSync(expectedPath)).toBe(true);
  });

  it('getChats scoped by userId: wrong userId returns empty', async () => {
    const created = await createCharacter(baseInput('IsoChats'), 'user-A');

    // Insert a chat record linked to the character
    const chatFileId = `test-chat-${Date.now()}`;
    await db.insert(chats).values({
      fileId: chatFileId,
      fileName: 'test_chat.json',
      characterId: created.id,
      fileSize: 100,
      messageCount: 5,
      userId: 'user-A',
    });

    // getChats for user-B should return [] (character not found)
    const wrongUser = await characterService.getChats('IsoChats.png', 'user-B');
    expect(wrongUser).toHaveLength(0);

    // getChats for user-A should return the chat
    const rightUser = await characterService.getChats('IsoChats.png', 'user-A');
    expect(rightUser).toHaveLength(1);
    expect(rightUser[0]!.fileId).toBe(chatFileId);
  });

  // ─── Server-controlled date automation tests ──────────────────────────

  it('create stamps creation_date and modification_date server-side', async () => {
    const before = Date.now();
    const created = await createCharacter(baseInput('DateStamp_Create'));
    const after = Date.now();

    expect(typeof created.creation_date).toBe('number');
    expect(typeof created.modification_date).toBe('number');
    expect(created.creation_date!).toBeGreaterThanOrEqual(before);
    expect(created.creation_date!).toBeLessThanOrEqual(after);
    expect(created.modification_date).toBe(created.creation_date);
  });

  it('edit bumps modification_date and preserves creation_date (ignores client-supplied dates)', async () => {
    const created = await createCharacter(baseInput('DateStamp_Edit'));
    const originalCreation = created.creation_date;

    // Wait a tick so Date.now() advances measurably
    await new Promise((resolve) => setTimeout(resolve, 5));

    // Malicious client tries to forge creation_date AND set modification_date
    await characterService.edit(created.id, TEST_USER, {
      description: 'edited',
      creation_date: 1,
      modification_date: 1,
    });

    const fetched = await characterService.get(created.id, TEST_USER);
    expect(fetched).not.toBeNull();
    expect(fetched!.description).toBe('edited');
    // creation_date must be immutable after create — client's 1 is rejected
    expect(fetched!.creation_date).toBe(originalCreation);
    // modification_date must be bumped server-side, NOT 1
    expect(typeof fetched!.modification_date).toBe('number');
    expect(fetched!.modification_date!).toBeGreaterThan(originalCreation!);
    expect(fetched!.modification_date).not.toBe(1);
  });

  it('duplicate resets both creation_date and modification_date to now', async () => {
    const created = await createCharacter(baseInput('DateStamp_DupSrc'));
    const sourceCreation = created.creation_date;

    // Wait so the dup's timestamps are measurably later than the source's
    await new Promise((resolve) => setTimeout(resolve, 5));

    const beforeDup = Date.now();
    const newId = await characterService.duplicate(created.id, TEST_USER);
    createdIds.push(newId);
    const afterDup = Date.now();

    const dup = await characterService.get(newId, TEST_USER);
    expect(dup).not.toBeNull();
    expect(typeof dup!.creation_date).toBe('number');
    expect(typeof dup!.modification_date).toBe('number');
    // Dup's creation_date must NOT match the source's — it's a new character
    expect(dup!.creation_date).not.toBe(sourceCreation);
    expect(dup!.creation_date!).toBeGreaterThanOrEqual(beforeDup);
    expect(dup!.creation_date!).toBeLessThanOrEqual(afterDup);
    expect(dup!.modification_date).toBe(dup!.creation_date);
  });
});
