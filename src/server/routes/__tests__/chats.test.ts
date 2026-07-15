import { describe, it, expect } from 'bun:test';
import { chatsRoutes } from '@/server/routes/chats.routes';

describe('Chats routes', () => {
  it('save returns ok and fileId', async () => {
    const res = await chatsRoutes.save(
      new Request('http://localhost/api/v1/chats/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterName: 'RouteTest', userName: 'User' }),
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.ok).toBe(true);
    expect(typeof data.fileId).toBe('string');
  });

  it('get returns messages and metadata', async () => {
    const saveRes = await chatsRoutes.save(
      new Request('http://localhost/api/v1/chats/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterName: 'GetTest', userName: 'User' }),
      }),
    );
    const saveData = (await saveRes.json()) as { fileId: string };
    const fileId = saveData.fileId;

    const res = await chatsRoutes.get(
      new Request('http://localhost/api/v1/chats/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.messages)).toBe(true);
    expect(data.metadata).toBeDefined();

    await chatsRoutes.delete(
      new Request('http://localhost/api/v1/chats/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      }),
    );
  });

  it('delete succeeds', async () => {
    const saveRes = await chatsRoutes.save(
      new Request('http://localhost/api/v1/chats/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterName: 'DelTest', userName: 'User' }),
      }),
    );
    const saveData = (await saveRes.json()) as { fileId: string };

    const res = await chatsRoutes.delete(
      new Request('http://localhost/api/v1/chats/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: saveData.fileId }),
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.ok).toBe(true);
  });

  it('message append and get', async () => {
    const saveRes = await chatsRoutes.save(
      new Request('http://localhost/api/v1/chats/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterName: 'MsgTest', userName: 'User' }),
      }),
    );
    const saveData = (await saveRes.json()) as { fileId: string };
    const fileId = saveData.fileId;

    const msgRes = await chatsRoutes.message(
      new Request('http://localhost/api/v1/chats/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          action: 'append',
          message: {
            name: 'User',
            is_user: true,
            mes: 'Route message test',
            extra: {},
          },
        }),
      }),
    );
    expect(msgRes.status).toBe(200);

    const getRes = await chatsRoutes.get(
      new Request('http://localhost/api/v1/chats/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      }),
    );
    const getData = (await getRes.json()) as { messages: Array<{ mes: string }> };
    expect(getData.messages.length).toBe(1);
    expect(getData.messages[0]!.mes).toBe('Route message test');

    await chatsRoutes.delete(
      new Request('http://localhost/api/v1/chats/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      }),
    );
  });
});
