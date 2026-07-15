import { describe, it, expect } from 'bun:test';
import { presetsRoutes } from '@/server/routes/presets.routes';
import type { Preset } from '@/shared/types/preset';

const testPreset: Preset = {
  category: 'sysprompt',
  data: { name: 'route-test-preset-t14', content: 'Route test content.' },
} as Preset;

describe('Presets routes', () => {
  it('save returns ok', async () => {
    const res = await presetsRoutes.save(
      new Request('http://localhost/api/v1/presets/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: testPreset }),
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.ok).toBe(true);
  });

  it('get returns the preset', async () => {
    const res = await presetsRoutes.get(
      new Request('http://localhost/api/v1/presets/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'sysprompt',
          name: 'route-test-preset-t14',
        }),
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      category: string;
      data: Record<string, unknown>;
    };
    expect(data.category).toBe('sysprompt');
    expect(data.data.content).toBe('Route test content.');
  });

  it('all returns array with preset', async () => {
    const res = await presetsRoutes.all(
      new Request('http://localhost/api/v1/presets/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'sysprompt' }),
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      category: string;
      data: Record<string, unknown>;
    }[];
    expect(Array.isArray(data)).toBe(true);
    const found = data.find((p) => (p.data.name as string) === 'route-test-preset-t14');
    expect(found).not.toBeNull();
  });

  it('export returns file response', async () => {
    const res = await presetsRoutes.export(
      new Request('http://localhost/api/v1/presets/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'sysprompt',
          name: 'route-test-preset-t14',
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('Content-Disposition')?.includes('route-test-preset-t14.json')).toBe(
      true,
    );
  });

  it('get non-existent returns 404', async () => {
    const res = await presetsRoutes.get(
      new Request('http://localhost/api/v1/presets/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'sysprompt',
          name: 'nonexistent-route-t14',
        }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it('delete returns ok', async () => {
    const res = await presetsRoutes.delete(
      new Request('http://localhost/api/v1/presets/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'sysprompt',
          name: 'route-test-preset-t14',
        }),
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.ok).toBe(true);
  });

  it('get after delete returns 404', async () => {
    const res = await presetsRoutes.get(
      new Request('http://localhost/api/v1/presets/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'sysprompt',
          name: 'route-test-preset-t14',
        }),
      }),
    );
    expect(res.status).toBe(404);
  });
});
