import { characterService } from '@/server/services/character.service';

export type ExportFormat = 'png' | 'json' | 'yaml';

export async function exportCharacter(
  dbId: number,
  userId: string,
  format: ExportFormat,
): Promise<{ data: Buffer; mimeType: string; fileName: string }> {
  return characterService.exportCharacter(dbId, userId, format);
}

export async function exportToPng(
  dbId: number,
  userId: string,
): Promise<{ data: Buffer; mimeType: string; fileName: string }> {
  return exportCharacter(dbId, userId, 'png');
}

export async function exportToJson(
  dbId: number,
  userId: string,
): Promise<{ data: Buffer; mimeType: string; fileName: string }> {
  return exportCharacter(dbId, userId, 'json');
}

export async function exportToYaml(
  dbId: number,
  userId: string,
): Promise<{ data: Buffer; mimeType: string; fileName: string }> {
  return exportCharacter(dbId, userId, 'yaml');
}
