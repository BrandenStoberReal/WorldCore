import { describe, it, expect } from 'bun:test';
import { themesRoutes } from '@/server/routes/themes.routes';
import { quickrepliesRoutes } from '@/server/routes/quickreplies.routes';
import { movinguiRoutes } from '@/server/routes/movingui.routes';
import { statsRoutes } from '@/server/routes/stats.routes';
import { classifyRoutes } from '@/server/routes/classify.routes';
import { captionRoutes } from '@/server/routes/caption.routes';
import { backupsRoutes } from '@/server/routes/backups.routes';
import { datamaidsRoutes } from '@/server/routes/datamaids.routes';
import { contentRoutes } from '@/server/routes/content.routes';
import { extensionsRoutes } from '@/server/routes/extensions.routes';

describe('Themes routes (T25)', () => {
  it('save and get round trip', async () => {
    const saveRes = await themesRoutes.save(
      new Request('http://localhost/api/v1/themes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: { name: 'test-theme-t25', colors: { bg: '#000' } },
        }),
      }),
    );
    expect(saveRes.status).toBe(200);

    const getRes = await themesRoutes.get(
      new Request('http://localhost/api/v1/themes/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test-theme-t25' }),
      }),
    );
    expect(getRes.status).toBe(200);
    const data = (await getRes.json()) as { name: string; colors: Record<string, string> };
    expect(data.name).toBe('test-theme-t25');
    expect(data.colors.bg).toBe('#000');
  });

  it('all returns array with theme', async () => {
    const res = await themesRoutes.all(
      new Request('http://localhost/api/v1/themes/all', {
        method: 'POST',
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<Record<string, unknown>>;
    expect(Array.isArray(data)).toBe(true);
    const found = data.find((t) => (t.name as string) === 'test-theme-t25');
    expect(found).not.toBeNull();
  });

  it('delete returns ok', async () => {
    const res = await themesRoutes.delete(
      new Request('http://localhost/api/v1/themes/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test-theme-t25' }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it('get non-existent returns 404', async () => {
    const res = await themesRoutes.get(
      new Request('http://localhost/api/v1/themes/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test-theme-t25' }),
      }),
    );
    expect(res.status).toBe(404);
  });
});

describe('QuickReplies routes (T25)', () => {
  it('save and get round trip', async () => {
    const saveRes = await quickrepliesRoutes.save(
      new Request('http://localhost/api/v1/quickreplies/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reply: { title: 'Test Reply T25', prompt: 'Hello world' },
        }),
      }),
    );
    expect(saveRes.status).toBe(200);

    const getRes = await quickrepliesRoutes.get(
      new Request('http://localhost/api/v1/quickreplies/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test-reply-t25' }),
      }),
    );
    expect(getRes.status).toBe(200);
    const data = (await getRes.json()) as { title: string; prompt: string };
    expect(data.title).toBe('Test Reply T25');
    expect(data.prompt).toBe('Hello world');
  });

  it('all returns array', async () => {
    const res = await quickrepliesRoutes.all(
      new Request('http://localhost/api/v1/quickreplies/all', {
        method: 'POST',
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<Record<string, unknown>>;
    expect(Array.isArray(data)).toBe(true);
  });

  it('delete returns ok', async () => {
    const res = await quickrepliesRoutes.delete(
      new Request('http://localhost/api/v1/quickreplies/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test-reply-t25' }),
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe('MovingUI routes (T25)', () => {
  it('save and get round trip', async () => {
    const saveRes = await movinguiRoutes.save(
      new Request('http://localhost/api/v1/movingui/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panel1: { x: 10, y: 20 } }),
      }),
    );
    expect(saveRes.status).toBe(200);

    const getRes = await movinguiRoutes.get(
      new Request('http://localhost/api/v1/movingui/get', {
        method: 'POST',
      }),
    );
    expect(getRes.status).toBe(200);
    const data = (await getRes.json()) as Record<string, unknown>;
    expect(data.panel1).toBeDefined();
  });
});

describe('Stats routes (T25)', () => {
  it('save and get round trip', async () => {
    const saveRes = await statsRoutes.save(
      new Request('http://localhost/api/v1/stats/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokensGenerated: 42 }),
      }),
    );
    expect(saveRes.status).toBe(200);

    const getRes = await statsRoutes.get(
      new Request('http://localhost/api/v1/stats/get', {
        method: 'POST',
      }),
    );
    expect(getRes.status).toBe(200);
    const data = (await getRes.json()) as Record<string, unknown>;
    expect(data.tokensGenerated).toBe(42);
  });
});

describe('Classify route (T25)', () => {
  it('returns ok stub', async () => {
    const res = await classifyRoutes.classify(
      new Request('http://localhost/api/v1/classify', {
        method: 'POST',
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.ok).toBe(true);
  });
});

describe('Caption route (T25)', () => {
  it('returns ok stub', async () => {
    const res = await captionRoutes.caption(
      new Request('http://localhost/api/v1/caption', {
        method: 'POST',
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.ok).toBe(true);
  });
});

describe('Backups routes (T25)', () => {
  it('create returns ok with id', async () => {
    const res = await backupsRoutes.create(
      new Request('http://localhost/api/v1/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test-backup-t25' }),
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; id: string; name: string };
    expect(data.ok).toBe(true);
    expect(data.id).toBeDefined();
    expect(data.name).toBe('test-backup-t25');
  });

  it('restore returns ok for existing backup', async () => {
    const createRes = await backupsRoutes.create(
      new Request('http://localhost/api/v1/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test-backup-restore-t25' }),
      }),
    );
    const createData = (await createRes.json()) as { id: string };

    const res = await backupsRoutes.restore(
      new Request('http://localhost/api/v1/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: createData.id }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it('restore non-existent returns 404', async () => {
    const res = await backupsRoutes.restore(
      new Request('http://localhost/api/v1/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'nonexistent-t25' }),
      }),
    );
    expect(res.status).toBe(404);
  });
});

describe('Datamaids route (T25)', () => {
  it('returns ok stub', async () => {
    const res = await datamaidsRoutes.handle(
      new Request('http://localhost/api/v1/datamaids', {
        method: 'POST',
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.ok).toBe(true);
  });
});

describe('Content route (T25)', () => {
  it('returns ok stub', async () => {
    const res = await contentRoutes.handle(
      new Request('http://localhost/api/v1/content', {
        method: 'POST',
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.ok).toBe(true);
  });
});

describe('Extensions routes (T25)', () => {
  it('list returns empty array', async () => {
    const res = await extensionsRoutes.list(
      new Request('http://localhost/api/v1/extensions/list', {
        method: 'POST',
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as Array<Record<string, unknown>>;
    expect(Array.isArray(data)).toBe(true);
  });

  it('enable non-existent returns 404', async () => {
    const res = await extensionsRoutes.enable(
      new Request('http://localhost/api/v1/extensions/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'nonexistent-t25' }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it('disable non-existent returns 404', async () => {
    const res = await extensionsRoutes.disable(
      new Request('http://localhost/api/v1/extensions/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'nonexistent-t25' }),
      }),
    );
    expect(res.status).toBe(404);
  });
});
