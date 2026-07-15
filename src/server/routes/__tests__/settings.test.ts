import { describe, it, expect } from 'bun:test';
import { settingsRoutes } from '@/server/routes/settings.routes';

describe('Settings routes', () => {
  it('save and get round trip', async () => {
    const saveRes = await settingsRoutes.save(
      new Request('http://localhost/api/v1/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'dark', fontSize: 14 }),
      }),
    );
    expect(saveRes.status).toBe(200);

    const getRes = await settingsRoutes.get(
      new Request('http://localhost/api/v1/settings/get', {
        method: 'POST',
      }),
    );
    expect(getRes.status).toBe(200);
    const data = (await getRes.json()) as Record<string, unknown>;
    expect(data.theme).toBe('dark');
    expect(data.fontSize).toBe(14);
  });

  it('make snapshot and restore', async () => {
    await settingsRoutes.save(
      new Request('http://localhost/api/v1/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'solarized' }),
      }),
    );

    const snapRes = await settingsRoutes.makeSnapshot(
      new Request('http://localhost/api/v1/settings/make-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'route-test' }),
      }),
    );
    expect(snapRes.status).toBe(200);
    const snapData = (await snapRes.json()) as Record<string, unknown>;
    expect(snapData.ok).toBe(true);
    expect(snapData.id).toBeDefined();

    await settingsRoutes.save(
      new Request('http://localhost/api/v1/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'monokai' }),
      }),
    );

    const restoreRes = await settingsRoutes.restoreSnapshot(
      new Request('http://localhost/api/v1/settings/restore-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: snapData.id as string }),
      }),
    );
    expect(restoreRes.status).toBe(200);

    const getRes = await settingsRoutes.get(
      new Request('http://localhost/api/v1/settings/get', {
        method: 'POST',
      }),
    );
    const restoredData = (await getRes.json()) as Record<string, unknown>;
    expect(restoredData.theme).toBe('solarized');
  });
});
