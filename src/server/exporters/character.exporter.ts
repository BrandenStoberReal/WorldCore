import { characterService } from '@/server/services/character.service';

export type ExportFormat = 'png' | 'json' | 'yaml';

export async function exportCharacter(
  dbId: number,
  format: ExportFormat,
): Promise<{ data: Buffer; mimeType: string; fileName: string }> {
  return characterService.exportCharacter(dbId, format);
}

export async function exportToPng(
  dbId: number,
): Promise<{ data: Buffer; mimeType: string; fileName: string }> {
  return exportCharacter(dbId, 'png');
}

export async function exportToJson(
  dbId: number,
): Promise<{ data: Buffer; mimeType: string; fileName: string }> {
  return exportCharacter(dbId, 'json');
}

export async function exportToYaml(
  dbId: number,
): Promise<{ data: Buffer; mimeType: string; fileName: string }> {
  return exportCharacter(dbId, 'yaml');
}
