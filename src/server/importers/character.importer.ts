import fs from 'node:fs/promises';
import path from 'node:path';
import { readCharacterCard } from '@/server/storage/png-metadata';
import { paths } from '@/server/storage/paths';
import { characterService } from '@/server/services/character.service';
import { removeFile } from '@/server/storage/fs';
import { parse, stringify } from 'yaml';
import sanitize from 'sanitize-filename';
import { createCanvas } from '@napi-rs/canvas';
import AdmZip from 'adm-zip';

const TEMP_UPLOAD_DIR = path.join('/tmp', 'WorldCore', 'uploads');

async function ensureTempDir(): Promise<void> {
  await fs.mkdir(TEMP_UPLOAD_DIR, { recursive: true });
}

async function generatePlaceholderPng(): Promise<Buffer> {
  const c = createCanvas(1, 1);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1, 1);
  return Buffer.from(c.toBuffer('image/png'));
}

function safeJsonParse(raw: string, context: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(
        `${context}: Expected a JSON object, got ${Array.isArray(parsed) ? 'array' : typeof parsed}`,
      );
    }
    return parsed as Record<string, unknown>;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`${context}: Invalid JSON - ${err.message}`);
    }
    throw err;
  }
}

function sanitizeZipEntryPath(entryName: string): string {
  const normalized = path.normalize(entryName);
  const parts = normalized.split(/[\\/]/);
  const safeParts: string[] = [];
  for (const part of parts) {
    if (part === '..' || part === '.') continue;
    if (part === '') continue;
    safeParts.push(part);
  }
  return safeParts.join('/');
}

function isSafeZipEntry(entryName: string): boolean {
  const normalized = path.normalize(entryName);
  return !normalized.startsWith('..') && !path.isAbsolute(normalized);
}

function normalizeToV3(raw: Record<string, unknown>): Record<string, unknown> {
  const data = { ...raw };

  // chara_card_v2 spec nests character fields inside a `data` key.
  // Flatten them to the top level so the rest of the pipeline sees a
  // consistent flat structure.
  if (
    data.spec &&
    typeof data.data === 'object' &&
    data.data !== null &&
    !Array.isArray(data.data)
  ) {
    const nested = data.data as Record<string, unknown>;
    for (const [key, value] of Object.entries(nested)) {
      if (data[key] === undefined || data[key] === null) {
        data[key] = value;
      }
    }
    delete data.data;
  }

  if (!data.spec && data.name !== undefined) {
    const rawExt = (data.extensions as Record<string, unknown>) || {};
    return {
      spec: 'chara_card_v2',
      spec_version: '2.0',
      name: data.name,
      description: data.description ?? data.personality ?? '',
      personality: data.personality ?? '',
      scenario: data.scenario ?? '',
      first_mes: data.first_mes ?? data.greeting ?? '',
      mes_example: data.mes_example ?? '',
      creator_notes: data.creator_notes ?? '',
      system_prompt: data.system_prompt ?? '',
      post_history_instructions: data.post_history_instructions ?? '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      creator: data.creator ?? '',
      character_version: data.character_version ?? '',
      alternate_greetings: Array.isArray(data.alternate_greetings) ? data.alternate_greetings : [],
      extensions: {
        talkativeness: 0.5,
        fav: false,
        world: '',
        depth_prompt: { prompt: '', depth: 4, role: 'system' },
        ...rawExt,
      },
    };
  }

  if (!data.name || typeof data.name !== 'string') {
    data.name = 'Unknown';
  }

  if (!data.extensions) {
    data.extensions = {
      talkativeness: 0.5,
      fav: false,
      world: '',
      depth_prompt: { prompt: '', depth: 4, role: 'system' },
    };
  }

  const ext = data.extensions as Record<string, unknown>;
  if (!ext.depth_prompt) {
    ext.depth_prompt = { prompt: '', depth: 4, role: 'system' };
  }

  return data;
}

export async function importFromPng(uploadPath: string, userId: string): Promise<number> {
  const jsonData = await readCharacterCard(uploadPath);
  if (!jsonData) {
    throw new Error('No character data found in PNG');
  }

  const parsed = safeJsonParse(jsonData, 'PNG character data');
  const normalized = normalizeToV3(parsed);

  const pngBuffer = await fs.readFile(uploadPath);
  await removeFile(uploadPath).catch(() => {});

  const normalizedJson = JSON.stringify(normalized);
  return characterService.importCharacter(pngBuffer, normalizedJson, userId);
}

export async function importFromJson(
  uploadPath: string,
  userId: string,
  avatarPath?: string,
): Promise<number> {
  const content = await fs.readFile(uploadPath, 'utf-8');
  const parsed = safeJsonParse(content, 'JSON character data');

  const normalized = normalizeToV3(parsed);

  let pngBuffer: Buffer;
  if (avatarPath) {
    pngBuffer = await fs.readFile(avatarPath);
    console.debug('[import] importFromJson using avatar file', {
      avatarPath,
      avatarSize: pngBuffer.length,
      avatarFirstBytes: pngBuffer.subarray(0, 8).toString('hex'),
    });
  } else {
    pngBuffer = await generatePlaceholderPng();
    console.debug('[import] importFromJson no avatar — using placeholder', {
      placeholderSize: pngBuffer.length,
    });
  }

  await removeFile(uploadPath).catch(() => {});

  const normalizedJson = JSON.stringify(normalized);
  return characterService.importCharacter(pngBuffer, normalizedJson, userId);
}

export async function importFromYaml(
  uploadPath: string,
  userId: string,
  avatarPath?: string,
): Promise<number> {
  const content = await fs.readFile(uploadPath, 'utf-8');
  let parsed: Record<string, unknown>;
  try {
    parsed = parse(content);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error(
        `Expected a YAML object, got ${Array.isArray(parsed) ? 'array' : typeof parsed}`,
      );
    }
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`YAML character data: ${err.message}`);
    }
    throw new Error('YAML character data: Invalid YAML');
  }

  const mapped: Record<string, unknown> = {
    name: parsed.name ?? 'Unknown',
    description: parsed.context ?? '',
    personality: parsed.personality ?? '',
    scenario: parsed.scenario ?? '',
    first_mes: parsed.greeting ?? parsed.first_mes ?? '',
    mes_example: parsed.mes_example ?? '',
    creator_notes: parsed.creator_notes ?? '',
    system_prompt: parsed.system_prompt ?? '',
    post_history_instructions: parsed.post_history_instructions ?? '',
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    creator: parsed.creator ?? '',
    character_version: parsed.character_version ?? '',
    alternate_greetings: Array.isArray(parsed.alternate_greetings)
      ? parsed.alternate_greetings
      : [],
    extensions: parsed.extensions ?? {},
  };

  const normalized = normalizeToV3(mapped);

  let pngBuffer: Buffer;
  if (avatarPath) {
    pngBuffer = await fs.readFile(avatarPath);
  } else {
    pngBuffer = await generatePlaceholderPng();
  }

  await removeFile(uploadPath).catch(() => {});

  const normalizedJson = JSON.stringify(normalized);
  return characterService.importCharacter(pngBuffer, normalizedJson, userId);
}

export async function importFromCharX(uploadPath: string, userId: string): Promise<number> {
  const content = await fs.readFile(uploadPath);
  const zip = new AdmZip(content as Buffer);

  const cardEntry = zip
    .getEntries()
    .find((e) => e.entryName === 'card.json' || e.entryName.endsWith('/card.json'));
  if (!cardEntry) {
    throw new Error('No card.json found in CharX archive');
  }

  const cardData = safeJsonParse(cardEntry.getData().toString('utf-8'), 'CharX card.json');
  const normalized = normalizeToV3(cardData);

  const avatarEntry = zip.getEntries().find((e) => {
    const name = e.entryName.toLowerCase();
    return name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.webp');
  });

  let pngBuffer: Buffer;
  if (avatarEntry) {
    pngBuffer = avatarEntry.getData() as Buffer;
  } else {
    pngBuffer = await generatePlaceholderPng();
  }

  for (const entry of zip.getEntries()) {
    if (entry.entryName.startsWith('assets/') && !entry.isDirectory) {
      const safeName = sanitizeZipEntryPath(entry.entryName);
      if (!safeName || !safeName.startsWith('assets/')) continue;
      const assetName = path.basename(safeName);
      const assetPath = path.join(paths.assets, assetName);
      await fs.mkdir(path.dirname(assetPath), { recursive: true });
      await fs.writeFile(assetPath, entry.getData() as Buffer);
    }
  }

  await removeFile(uploadPath).catch(() => {});

  const normalizedJson = JSON.stringify(normalized);
  return characterService.importCharacter(pngBuffer, normalizedJson, userId);
}

export async function importFromByaf(uploadPath: string, userId: string): Promise<number> {
  const content = await fs.readFile(uploadPath);
  const zip = new AdmZip(content as Buffer);

  const cardEntry = zip
    .getEntries()
    .find(
      (e) =>
        e.entryName === 'card.json' ||
        e.entryName === 'byaf.json' ||
        (e.entryName.endsWith('.json') && !e.entryName.includes('/')),
    );
  if (!cardEntry) {
    throw new Error('No card data found in BYAF archive');
  }

  const cardData = safeJsonParse(cardEntry.getData().toString('utf-8'), 'BYAF card data');
  const normalized = normalizeToV3(cardData);

  const avatarEntry = zip
    .getEntries()
    .find((e) => e.entryName === 'avatar.png' || e.entryName === 'avatar.jpg');

  let pngBuffer: Buffer;
  if (avatarEntry) {
    pngBuffer = avatarEntry.getData() as Buffer;
  } else {
    pngBuffer = await generatePlaceholderPng();
  }

  for (const entry of zip.getEntries()) {
    if (entry.entryName.startsWith('backgrounds/') && !entry.isDirectory) {
      const safeName = sanitizeZipEntryPath(entry.entryName);
      if (!safeName || !safeName.startsWith('backgrounds/')) continue;
      const bgName = path.basename(safeName);
      const bgPath = path.join(paths.backgrounds, bgName);
      await fs.mkdir(path.dirname(bgPath), { recursive: true });
      await fs.writeFile(bgPath, entry.getData() as Buffer);
    }
  }

  for (const entry of zip.getEntries()) {
    if (entry.entryName.startsWith('sprites/') && !entry.isDirectory) {
      const safeName = sanitizeZipEntryPath(entry.entryName);
      if (!safeName || !safeName.startsWith('sprites/')) continue;
      const spriteName = path.basename(safeName);
      const spritePath = path.join(paths.sprites, spriteName);
      await fs.mkdir(path.dirname(spritePath), { recursive: true });
      await fs.writeFile(spritePath, entry.getData() as Buffer);
    }
  }

  await removeFile(uploadPath).catch(() => {});

  const normalizedJson = JSON.stringify(normalized);
  return characterService.importCharacter(pngBuffer, normalizedJson, userId);
}

export type ImportFormat = 'png' | 'json' | 'yaml' | 'charx' | 'byaf';

export function detectImportFormat(fileName: string): ImportFormat {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.webp':
      return 'png';
    case '.json':
      return 'json';
    case '.yaml':
    case '.yml':
      return 'yaml';
    case '.zip':
      if (/charx/i.test(fileName)) return 'charx';
      if (/byaf/i.test(fileName)) return 'byaf';
      return 'charx';
    default:
      return 'json';
  }
}

export async function importCharacter(
  uploadPath: string,
  fileName: string,
  userId: string,
  avatarPath?: string,
): Promise<number> {
  const format = detectImportFormat(fileName);
  switch (format) {
    case 'png':
      return importFromPng(uploadPath, userId);
    case 'json':
      return importFromJson(uploadPath, userId, avatarPath);
    case 'yaml':
      return importFromYaml(uploadPath, userId, avatarPath);
    case 'charx':
      return importFromCharX(uploadPath, userId);
    case 'byaf':
      return importFromByaf(uploadPath, userId);
    default:
      const _exhaustive: never = format;
      throw new Error(`Unsupported import format: ${_exhaustive}`);
  }
}

export { normalizeToV3, ensureTempDir, TEMP_UPLOAD_DIR };
