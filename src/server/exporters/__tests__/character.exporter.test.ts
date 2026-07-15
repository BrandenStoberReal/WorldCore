import { describe, it, expect } from 'bun:test';
import { exportToJson, exportToYaml, exportToPng } from '../character.exporter';
import { characterService } from '@/server/services/character.service';
import type { CharacterCreateInput } from '@/shared/types/character';

const baseInput = (name: string): CharacterCreateInput => ({
  name,
  description: 'Test description for export',
  personality: 'Friendly and helpful',
  scenario: 'A testing environment',
  first_mes: "Hello, I'm a test character!",
  mes_example: '',
  creator_notes: '',
  system_prompt: '',
  post_history_instructions: '',
  tags: ['export', 'test'],
  creator: 'TestUser',
  character_version: '1.0',
  alternate_greetings: [],
});

describe('exportToJson', () => {
  it('exports character data as JSON', async () => {
    const created = await characterService.create(baseInput('ExportJsonTest'));
    expect(created.id).toBeGreaterThan(0);

    const result = await exportToJson(created.id);
    expect(result.mimeType).toBe('application/json');
    expect(result.fileName).toContain('.json');
    expect(result.data.length).toBeGreaterThan(0);

    const parsed = JSON.parse(result.data.toString('utf-8')) as Record<string, unknown>;
    expect(parsed.name).toBe('ExportJsonTest');
    expect(parsed.description).toBe('Test description for export');
    expect(parsed.tags).toEqual(['export', 'test']);
  });
});

describe('exportToYaml', () => {
  it('exports character data as YAML', async () => {
    const created = await characterService.create(baseInput('ExportYamlTest'));
    expect(created.id).toBeGreaterThan(0);

    const result = await exportToYaml(created.id);
    expect(result.mimeType).toBe('text/yaml');
    expect(result.fileName).toContain('.yaml');
    expect(result.data.length).toBeGreaterThan(0);

    const yamlStr = result.data.toString('utf-8');
    expect(yamlStr).toContain('name: ExportYamlTest');
    expect(yamlStr).toContain('description:');
  });
});

describe('exportToPng', () => {
  it('exports character PNG with metadata', async () => {
    const created = await characterService.create(baseInput('ExportPngTest'));
    expect(created.id).toBeGreaterThan(0);

    const result = await exportToPng(created.id);
    expect(result.mimeType).toBe('image/png');
    expect(result.fileName).toContain('.png');
    expect(result.data.length).toBeGreaterThan(0);

    const header = result.data.subarray(0, 8);
    const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(header).toEqual(pngSig);
  });
});
