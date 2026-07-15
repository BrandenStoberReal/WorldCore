import { describe, it, expect } from 'bun:test';
import { characterRoutes } from '@/server/routes/characters.routes';
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

describe('Character routes', () => {
  it('create returns ok and id', async () => {
    const res = await characterRoutes.create(
      new Request('http://localhost/api/v1/characters/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...baseInput('RouteTestChar'), description: 'From route test' }),
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; id: number };
    expect(data.ok).toBe(true);
    expect(typeof data.id).toBe('number');
  });

  it('all returns array', async () => {
    const res = await characterRoutes.all(
      new Request('http://localhost/api/v1/characters/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  it('get returns character data', async () => {
    const createRes = await characterRoutes.create(
      new Request('http://localhost/api/v1/characters/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...baseInput('GetTestChar'), description: 'For get test' }),
      }),
    );
    const createData = (await createRes.json()) as { id: number };

    const res = await characterRoutes.get(
      new Request('http://localhost/api/v1/characters/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: createData.id }),
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { name: string; description: string };
    expect(data.name).toBe('GetTestChar');
    expect(data.description).toBe('For get test');
  });

  it('delete succeeds', async () => {
    const createRes = await characterRoutes.create(
      new Request('http://localhost/api/v1/characters/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseInput('DeleteRouteChar')),
      }),
    );
    const createData = (await createRes.json()) as { id: number };

    const res = await characterRoutes.delete(
      new Request('http://localhost/api/v1/characters/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: createData.id }),
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean };
    expect(data.ok).toBe(true);
  });
});
