import { describe, it, expect, afterEach } from 'bun:test';
import { characterService } from '@/server/services/character.service';
import type { CharacterCreateInput } from '@/shared/types/character';

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
});

describe('CharacterService', () => {
  const createdIds: number[] = [];

  const createCharacter = async (input: CharacterCreateInput) => {
    const created = await characterService.create(input);
    createdIds.push(created.id);
    return created;
  };

  afterEach(async () => {
    for (const id of createdIds) {
      try {
        await characterService.delete(id);
      } catch {
        // Already deleted
      }
    }
    createdIds.length = 0;
  });

  it('create a character and get it back by ID', async () => {
    const created = await createCharacter(baseInput('TestChar_Svc'));

    expect(created.name).toBe('TestChar_Svc');
    expect(created.id).toBeGreaterThan(0);

    const fetched = await characterService.get(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe('TestChar_Svc');
  });

  it('rename updates name', async () => {
    const created = await createCharacter(baseInput('RenameMe_Svc'));

    await characterService.rename(created.id, 'RenamedChar_Svc');
    const fetched = await characterService.get(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe('RenamedChar_Svc');
  });

  it('edit updates fields', async () => {
    const created = await createCharacter({ ...baseInput('EditMe_Svc'), description: 'Original' });

    await characterService.edit(created.id, { description: 'Updated description' });
    const fetched = await characterService.get(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.description).toBe('Updated description');
  });

  it('delete removes character', async () => {
    const created = await characterService.create(baseInput('DeleteMe_Svc'));

    await characterService.delete(created.id);
    const fetched = await characterService.get(created.id);
    expect(fetched).toBeNull();
  });

  it('getAll returns list containing character', async () => {
    await createCharacter(baseInput('ListMe_Svc'));

    const all = await characterService.getAll();
    const found = (all as Array<{ name: string }>).find((c) => c.name === 'ListMe_Svc');
    expect(found).not.toBeNull();
  });

  it('duplicate creates new character with same data', async () => {
    const created = await createCharacter({
      ...baseInput('DupSource_Svc'),
      description: 'To duplicate',
      personality: 'Nice',
    });

    const newId = await characterService.duplicate(created.id);
    createdIds.push(newId);
    expect(newId).not.toBe(created.id);

    const dup = await characterService.get(newId);
    expect(dup).not.toBeNull();
    expect(dup!.name).toBe('DupSource_Svc (copy)');
    expect(dup!.description).toBe('To duplicate');
    expect(dup!.personality).toBe('Nice');
  });
});
