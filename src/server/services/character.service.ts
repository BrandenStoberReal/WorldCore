import { db } from '@/server/db/client';
import { characters, chats, personas } from '@/server/db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { getUserCharacterPath, getUserPath } from '@/server/storage/paths';
import { writeFile, readFile, removeFile, copyFile, exists as fsExists } from '@/server/storage/fs';
import { writeCharacterCard } from '@/server/storage/png-metadata';
import { ensurePngWithCardData } from '@/server/storage/image-normalize';
import path from 'node:path';
import { SHARED_CONST } from '@/shared/constants';
import type {
  Character,
  ShallowCharacter,
  CharacterCreateInput,
  CharacterData,
} from '@/shared/types/character';
import { NotFoundError, ValidationError, ConflictError } from '@/server/errors';
import * as yaml from 'yaml';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const DEFAULT_SPEC = 'chara_card_v3';
const DEFAULT_SPEC_VERSION = '3.0';
const THUMBNAIL_WIDTH = 128;

const ALLOWED_FIELDS = new Set([
  'name',
  'description',
  'personality',
  'scenario',
  'first_mes',
  'mes_example',
  'creator_notes',
  'system_prompt',
  'post_history_instructions',
  'tags',
  'creator',
  'character_version',
  'alternate_greetings',
  'spec',
  'spec_version',
  'data',
]);

async function generatePlaceholderPng(): Promise<Buffer> {
  const c = createCanvas(SHARED_CONST.AVATAR_WIDTH, SHARED_CONST.AVATAR_HEIGHT);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, SHARED_CONST.AVATAR_WIDTH, SHARED_CONST.AVATAR_HEIGHT);
  return Buffer.from(c.toBuffer('image/png'));
}

export function thumbnailPathFor(avatarFileName: string): string {
  const base = path.basename(avatarFileName, path.extname(avatarFileName));
  return `thumb_${base}.png`;
}

async function writeCharacterThumbnail(
  avatarPath: string,
  userId: string,
  avatarFileName: string,
): Promise<void> {
  if (!(await fsExists(avatarPath))) {
    console.debug('[import] writeCharacterThumbnail: avatar file missing', { avatarPath });
    return;
  }
  let image;
  try {
    const avatarBuf = await readFile(avatarPath);
    image = await loadImage(avatarBuf);
  } catch (err) {
    console.debug('[import] writeCharacterThumbnail: loadImage failed', {
      avatarPath,
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }
  if (image.width === 0 || image.height === 0) {
    console.debug('[import] writeCharacterThumbnail: zero dimension', {
      width: image.width,
      height: image.height,
    });
    return;
  }
  console.debug('[import] writeCharacterThumbnail: generating', {
    srcWidth: image.width,
    srcHeight: image.height,
  });
  const thumbW = Math.min(THUMBNAIL_WIDTH, image.width);
  const thumbH = Math.round(thumbW * (image.height / image.width));
  const c = createCanvas(thumbW, thumbH);
  const ctx = c.getContext('2d');
  ctx.drawImage(image, 0, 0, thumbW, thumbH);
  const thumbName = thumbnailPathFor(avatarFileName);
  const thumbPath = path.join(getUserCharacterPath(userId), thumbName);
  const buffer = Buffer.from(c.toBuffer('image/png'));
  await writeFile(thumbPath, buffer);
  console.debug('[import] writeCharacterThumbnail: written', { thumbPath, thumbSize: buffer.length });
}

function normalizeToV3(data: CharacterCreateInput): CharacterData {
  return {
    name: data.name,
    description: data.description ?? '',
    personality: data.personality ?? '',
    scenario: data.scenario ?? '',
    first_mes: data.first_mes ?? '',
    mes_example: data.mes_example ?? '',
    creator_notes: data.creator_notes ?? '',
    system_prompt: data.system_prompt ?? '',
    post_history_instructions: data.post_history_instructions ?? '',
    tags: data.tags ?? [],
    creator: data.creator ?? '',
    character_version: data.character_version ?? '',
    alternate_greetings: data.alternate_greetings ?? [],
    character_book: data.character_book,
    extensions: data.extensions,
    nickname: data.nickname,
    creator_notes_multilingual: data.creator_notes_multilingual,
    source: data.source ?? [],
    group_only_greetings: data.group_only_greetings ?? [],
    assets: data.assets ?? [],
    // creation_date / modification_date are server-controlled;
    // set in create()/edit()/importCharacter()/duplicate() below.
    creation_date: undefined,
    modification_date: undefined,
  };
}

export type CharacterWithId = { id: number } & Character;

function buildCharacter(
  id: number,
  data: CharacterData,
  avatar: string,
  fileName: string,
  spec: string,
  specVersion: string,
  createDate: string,
  dateAdded: number,
  dataSize: number,
  boundPersonaId: number | null = null,
): CharacterWithId {
  return {
    id,
    ...data,
    avatar,
    chat: fileName.replace('.png', '.json'),
    create_date: createDate,
    date_added: new Date(dateAdded).toISOString(),
    date_last_chat: undefined,
    chat_size: 0,
    data_size: dataSize,
    json_data: { spec, spec_version: specVersion },
    boundPersonaId,
  };
}

function buildShallowCharacter(
  id: number,
  data: CharacterData,
  avatar: string,
  fileName: string,
  createDate: string,
  dateAdded: number,
  dataSize: number,
): ShallowCharacter {
  return {
    id,
    shallow: true,
    avatar,
    chat: fileName.replace('.png', '.json'),
    create_date: createDate,
    date_added: new Date(dateAdded).toISOString(),
    date_last_chat: undefined,
    chat_size: 0,
    data_size: dataSize,
    name: data.name ?? 'Unknown',
    description: data.description ?? '',
    creator_notes: data.creator_notes ?? '',
    tags: data.tags ?? [],
    creator: data.creator ?? '',
    character_version: data.character_version ?? '',
  };
}

export class CharacterService {
  async create(input: CharacterCreateInput, userId: string): Promise<CharacterWithId> {
    const data = normalizeToV3(input);
    const spec = input.spec ?? DEFAULT_SPEC;
    const specVersion = input.spec_version ?? DEFAULT_SPEC_VERSION;
    const fileName = `${data.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    const filePath = path.join(getUserCharacterPath(userId), fileName);

    if (await fsExists(filePath)) {
      throw new ConflictError(`Character "${data.name}" already exists`);
    }

    let pngBuffer: Buffer;
    if (input.avatar && input.avatar.startsWith('data:image/')) {
      const base64Data = input.avatar.split(',')[1];
      pngBuffer = Buffer.from(base64Data!, 'base64');
    } else {
      pngBuffer = await generatePlaceholderPng();
    }

    const now = Date.now();
    data.creation_date = now;
    data.modification_date = now;

    const jsonData = JSON.stringify({ spec, spec_version: specVersion, ...data });
    await writeCharacterCard(pngBuffer, jsonData, filePath);
    await writeCharacterThumbnail(filePath, userId, fileName).catch((err) =>
      console.debug('[character] thumbnail op skipped', { op: 'create', userId, fileName, err }),
    );

    const createDate = new Date(now).toISOString();
    const dataSize = Buffer.from(jsonData).length;

    const result = await db
      .insert(characters)
      .values({
        name: data.name,
        avatar: fileName,
        fileName,
        jsonData,
        spec,
        specVersion,
        tags: data.tags,
        creator: data.creator,
        characterVersion: data.character_version,
        createDate,
        dateAdded: now,
        dateLastChat: 0,
        chatSize: 0,
        dataSize,
        fav: false,
        userId,
      })
      .returning();

    const row = result[0]!;
    return buildCharacter(
      Number(row.id),
      data,
      fileName,
      fileName,
      spec,
      specVersion,
      createDate,
      now,
      dataSize,
    );
  }

  async rename(id: number, userId: string, newName: string): Promise<void> {
    const row = await db
      .select()
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)))
      .limit(1);
    if (row.length === 0) {
      throw new NotFoundError(`Character with id ${id}`);
    }
    const charRow = row[0]!;
    const parsedData = JSON.parse(charRow.jsonData) as CharacterData;
    parsedData.name = newName;

    const newFileName = `${newName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    const userChars = getUserCharacterPath(userId);
    const oldFilePath = path.join(userChars, charRow.avatar);
    const newFilePath = path.join(userChars, newFileName);

    if (newFilePath !== oldFilePath && (await fsExists(newFilePath))) {
      throw new ConflictError(`Character "${newName}" already exists`);
    }

    const jsonData = JSON.stringify(parsedData);
    await writeCharacterCard(oldFilePath, jsonData, newFilePath);
    await removeFile(oldFilePath);
    const oldThumbPath = path.join(userChars, thumbnailPathFor(charRow.avatar));
    await removeFile(oldThumbPath).catch((err) =>
      console.debug('[character] thumbnail op skipped', {
        op: 'rename-remove',
        userId,
        oldThumbPath,
        err,
      }),
    );
    await writeCharacterThumbnail(newFilePath, userId, newFileName).catch((err) =>
      console.debug('[character] thumbnail op skipped', {
        op: 'rename-write',
        userId,
        newFileName,
        err,
      }),
    );

    await db
      .update(characters)
      .set({
        name: newName,
        avatar: newFileName,
        fileName: newFileName,
        jsonData,
      })
      .where(and(eq(characters.id, id), eq(characters.userId, userId)));
  }

  async edit(id: number, userId: string, data: Partial<CharacterData>): Promise<void> {
    const row = await db
      .select()
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)))
      .limit(1);
    if (row.length === 0) {
      throw new NotFoundError(`Character with id ${id}`);
    }
    const charRow = row[0]!;
    const parsedData = JSON.parse(charRow.jsonData) as CharacterData;
    const clientData = { ...data } as Partial<CharacterData>;
    // creation_date is immutable after create; modification_date bumps on every edit.
    delete clientData.creation_date;
    delete clientData.modification_date;
    const merged = { ...parsedData, ...clientData } as CharacterData;
    merged.modification_date = Date.now();
    merged.creation_date = parsedData.creation_date ?? merged.creation_date;

    const filePath = path.join(getUserCharacterPath(userId), charRow.avatar);
    const jsonData = JSON.stringify(merged);
    await writeCharacterCard(filePath, jsonData, filePath);

    await db
      .update(characters)
      .set({
        name: merged.name,
        jsonData,
        tags: merged.tags,
        creator: merged.creator,
        characterVersion: merged.character_version,
        dataSize: Buffer.from(jsonData).length,
      })
      .where(and(eq(characters.id, id), eq(characters.userId, userId)));
  }

  async editAvatar(id: number, userId: string, avatarData: string | Buffer): Promise<void> {
    const row = await db
      .select()
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)))
      .limit(1);
    if (row.length === 0) {
      throw new NotFoundError(`Character with id ${id}`);
    }
    const charRow = row[0]!;
    const filePath = path.join(getUserCharacterPath(userId), charRow.avatar);

    let pngBuffer: Buffer;
    if (typeof avatarData === 'string') {
      const dataUriMatch = avatarData.match(/^data:image\/[a-z]+;base64,(.+)$/);
      if (!dataUriMatch?.[1]) {
        throw new ValidationError('Avatar must be a base64 data URI or Buffer');
      }
      pngBuffer = Buffer.from(dataUriMatch[1], 'base64');
    } else {
      pngBuffer = avatarData;
    }
    await writeCharacterCard(pngBuffer, charRow.jsonData, filePath);
    await writeCharacterThumbnail(filePath, userId, charRow.avatar).catch((err) =>
      console.debug('[character] thumbnail op skipped', {
        op: 'avatar-write',
        userId,
        avatar: charRow.avatar,
        err,
      }),
    );
  }

  async bindPersona(id: number, userId: string, personaId: number | null): Promise<void> {
    const row = await db
      .select()
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)))
      .limit(1);
    if (row.length === 0) {
      throw new NotFoundError(`Character with id ${id}`);
    }

    // Validate persona exists before binding (skip check for unbinding)
    if (personaId !== null) {
      const personaRow = await db
        .select({ id: personas.id })
        .from(personas)
        .where(and(eq(personas.id, personaId), eq(personas.userId, userId)))
        .limit(1);
      if (personaRow.length === 0) {
        throw new NotFoundError(`Persona with id ${personaId}`);
      }
    }

    await db
      .update(characters)
      .set({ boundPersonaId: personaId })
      .where(and(eq(characters.id, id), eq(characters.userId, userId)));
  }

  async editAttribute(
    id: number,
    userId: string,
    field: string,
    value: string | string[] | boolean | number,
  ): Promise<void> {
    const row = await db
      .select()
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)))
      .limit(1);
    if (row.length === 0) {
      throw new NotFoundError(`Character with id ${id}`);
    }
    const charRow = row[0]!;
    const parsedData = JSON.parse(charRow.jsonData) as Record<string, unknown> & CharacterData;
    if (!ALLOWED_FIELDS.has(field)) {
      throw new ValidationError({ message: `Field "${field}" is not editable` });
    }
    parsedData[field as keyof CharacterData] = value as never;
    parsedData.modification_date = Date.now();

    const filePath = path.join(getUserCharacterPath(userId), charRow.avatar);
    const jsonData = JSON.stringify(parsedData);
    await writeCharacterCard(filePath, jsonData, filePath);

    const updateData: Record<string, unknown> = { jsonData };
    if (field === 'name') updateData.name = value;
    if (field === 'tags') updateData.tags = value as string[];
    if (field === 'creator') updateData.creator = value as string;
    if (field === 'character_version') updateData.characterVersion = value as string;
    updateData.dataSize = Buffer.from(jsonData).length;

    await db
      .update(characters)
      .set(updateData)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)));
  }

  async mergeAttributes(id: number, userId: string, attrs: Record<string, unknown>): Promise<void> {
    const row = await db
      .select()
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)))
      .limit(1);
    if (row.length === 0) {
      throw new NotFoundError(`Character with id ${id}`);
    }
    const charRow = row[0]!;
    const parsedData = JSON.parse(charRow.jsonData) as Record<string, unknown> & CharacterData;
    const clientAttrs = { ...attrs };
    for (const field of Object.keys(clientAttrs)) {
      if (!ALLOWED_FIELDS.has(field)) {
        throw new ValidationError({ message: `Field "${field}" is not editable` });
      }
    }
    delete clientAttrs.creation_date;
    delete clientAttrs.modification_date;
    const merged = { ...parsedData, ...clientAttrs } as CharacterData;
    merged.modification_date = Date.now();
    merged.creation_date = (parsedData.creation_date as number | undefined) ?? merged.creation_date;

    const filePath = path.join(getUserCharacterPath(userId), charRow.avatar);
    const jsonData = JSON.stringify(merged);
    await writeCharacterCard(filePath, jsonData, filePath);

    const updateData: Record<string, unknown> = { jsonData };
    if ('name' in attrs) updateData.name = attrs.name;
    if ('tags' in attrs) updateData.tags = attrs.tags as string[];
    if ('creator' in attrs) updateData.creator = attrs.creator as string;
    if ('character_version' in attrs)
      updateData.characterVersion = attrs.character_version as string;
    updateData.dataSize = Buffer.from(jsonData).length;

    await db
      .update(characters)
      .set(updateData)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)));
  }

  async delete(id: number, userId: string): Promise<void> {
    const row = await db
      .select()
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)))
      .limit(1);
    if (row.length === 0) {
      throw new NotFoundError(`Character with id ${id}`);
    }
    const charRow = row[0]!;

    const pngPath = path.join(getUserCharacterPath(userId), charRow.avatar);
    await removeFile(pngPath);
    const thumbPath = path.join(getUserCharacterPath(userId), thumbnailPathFor(charRow.avatar));
    await removeFile(thumbPath).catch((err) =>
      console.debug('[character] thumbnail op skipped', {
        op: 'delete-remove',
        userId,
        thumbPath,
        err,
      }),
    );

    const chatFileName = charRow.fileName.replace('.png', '.json');
    const chatPath = path.join(getUserPath(userId), 'chats', chatFileName);
    await removeFile(chatPath);

    await db.transaction(async (tx) => {
      await tx.delete(chats).where(eq(chats.characterId, id));
      await tx.delete(characters).where(and(eq(characters.id, id), eq(characters.userId, userId)));
    });
  }

  async deleteByFileNameIfExists(fileName: string, userId: string): Promise<boolean> {
    const rows = await db
      .select({ id: characters.id })
      .from(characters)
      .where(and(eq(characters.fileName, fileName), eq(characters.userId, userId)))
      .limit(1);
    if (rows.length === 0) return false;
    await this.delete(Number(rows[0]!.id), userId);
    return true;
  }

  async getAll(userId: string, shallow?: boolean): Promise<CharacterWithId[] | ShallowCharacter[]> {
    const rows = await db
      .select()
      .from(characters)
      .where(eq(characters.userId, userId))
      .orderBy(asc(characters.name));

    if (shallow) {
      return rows.map((row) => {
        const data = JSON.parse(row.jsonData) as CharacterData;
        return buildShallowCharacter(
          Number(row.id),
          data,
          row.avatar,
          row.fileName,
          row.createDate,
          row.dateAdded,
          row.dataSize,
        );
      });
    }

    return rows.map((row) => {
      const data = JSON.parse(row.jsonData) as CharacterData;
      return buildCharacter(
        Number(row.id),
        data,
        row.avatar,
        row.fileName,
        row.spec,
        row.specVersion,
        row.createDate,
        row.dateAdded,
        row.dataSize,
      );
    });
  }

  async getThumbnailPath(id: number, userId: string): Promise<string | null> {
    const rows = await db
      .select({ id: characters.id, avatar: characters.avatar })
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)))
      .limit(1);
    if (rows.length === 0) return null;
    const charRow = rows[0]!;
    const userChars = getUserCharacterPath(userId);
    const avatarPath = path.join(userChars, charRow.avatar);
    const thumbPath = path.join(userChars, thumbnailPathFor(charRow.avatar));
    if (!(await fsExists(thumbPath))) {
      await writeCharacterThumbnail(avatarPath, userId, charRow.avatar).catch((err) =>
        console.debug('[character] thumbnail op skipped', {
          op: 'regen',
          userId,
          avatar: charRow.avatar,
          err,
        }),
      );
    }
    return (await fsExists(thumbPath)) ? thumbPath : null;
  }

  async get(id: number, userId: string): Promise<CharacterWithId | null> {
    const rows = await db
      .select()
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)))
      .limit(1);
    if (rows.length === 0) return null;
    const row = rows[0]!;
    const data = JSON.parse(row.jsonData) as CharacterData;
    return buildCharacter(
      Number(row.id),
      data,
      row.avatar,
      row.fileName,
      row.spec,
      row.specVersion,
      row.createDate,
      row.dateAdded,
      row.dataSize,
      row.boundPersonaId,
    );
  }

  async getByFileName(fileName: string, userId: string): Promise<CharacterWithId | null> {
    const rows = await db
      .select()
      .from(characters)
      .where(and(eq(characters.fileName, fileName), eq(characters.userId, userId)))
      .limit(1);
    if (rows.length === 0) return null;
    const row = rows[0]!;
    const data = JSON.parse(row.jsonData) as CharacterData;
    return buildCharacter(
      Number(row.id),
      data,
      row.avatar,
      row.fileName,
      row.spec,
      row.specVersion,
      row.createDate,
      row.dateAdded,
      row.dataSize,
      row.boundPersonaId,
    );
  }

  async getChats(
    fileName: string,
    userId: string,
  ): Promise<Array<{ fileId: string; fileName: string }>> {
    const charRows = await db
      .select()
      .from(characters)
      .where(and(eq(characters.fileName, fileName), eq(characters.userId, userId)))
      .limit(1);
    if (charRows.length === 0) return [];
    const charId = Number(charRows[0]!.id);

    const chatRows = await db
      .select({ fileId: chats.fileId, fileName: chats.fileName })
      .from(chats)
      .where(eq(chats.characterId, charId));
    return chatRows;
  }

  async duplicate(id: number, userId: string): Promise<number> {
    const row = await db
      .select()
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)))
      .limit(1);
    if (row.length === 0) {
      throw new NotFoundError(`Character with id ${id}`);
    }
    const sourceRow = row[0]!;
    const sourceData = JSON.parse(sourceRow.jsonData) as CharacterData;

    const dupName = `${sourceData.name} (copy)`;
    const dupFileName = `${dupName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    const userChars = getUserCharacterPath(userId);
    const sourceFilePath = path.join(userChars, sourceRow.avatar);
    const dupFilePath = path.join(userChars, dupFileName);

    const now = Date.now();
    const dupData = JSON.parse(JSON.stringify(sourceData)) as CharacterData;
    dupData.name = dupName;
    dupData.creation_date = now;
    dupData.modification_date = now;
    const dupJsonData = JSON.stringify(dupData);

    await copyFile(sourceFilePath, dupFilePath);
    await writeCharacterCard(dupFilePath, dupJsonData, dupFilePath);
    const sourceThumbPath = path.join(userChars, thumbnailPathFor(sourceRow.avatar));
    const dupThumbPath = path.join(userChars, thumbnailPathFor(dupFileName));
    await copyFile(sourceThumbPath, dupThumbPath).catch(async (err) => {
      console.debug('[character] thumbnail op skipped', {
        op: 'dup-copy',
        userId,
        dupFileName,
        err,
      });
      await writeCharacterThumbnail(dupFilePath, userId, dupFileName).catch((innerErr) =>
        console.debug('[character] thumbnail op skipped', {
          op: 'dup-gen',
          userId,
          dupFileName,
          err: innerErr,
        }),
      );
    });

    const createDate = new Date(now).toISOString();

    const result = await db
      .insert(characters)
      .values({
        name: dupName,
        avatar: dupFileName,
        fileName: dupFileName,
        jsonData: dupJsonData,
        spec: sourceRow.spec,
        specVersion: sourceRow.specVersion,
        tags: dupData.tags,
        creator: dupData.creator,
        characterVersion: dupData.character_version,
        createDate,
        dateAdded: now,
        dateLastChat: 0,
        chatSize: 0,
        dataSize: Buffer.from(dupJsonData).length,
        fav: false,
        userId,
      })
      .returning();

    return Number(result[0]!.id);
  }

  async importCharacter(pngData: Buffer, jsonData: string, userId: string): Promise<number> {
    const parsed = JSON.parse(jsonData) as CharacterData & {
      spec?: string;
      spec_version?: string;
    };
    const spec = parsed.spec ?? DEFAULT_SPEC;
    const specVersion = parsed.spec_version ?? DEFAULT_SPEC_VERSION;

    if (!parsed.name || typeof parsed.name !== 'string') {
      parsed.name = 'Unknown';
    }

    const baseName = parsed.name.replace(/[^a-zA-Z0-9]/g, '_');
    let fileName = `${baseName}.png`;
    let destPath = path.join(getUserCharacterPath(userId), fileName);
    let counter = 1;
    while (await fsExists(destPath)) {
      fileName = `${baseName}_${counter}.png`;
      destPath = path.join(getUserCharacterPath(userId), fileName);
      counter++;
    }

    const now = Date.now();
    parsed.modification_date = now;
    if (parsed.creation_date == null) {
      parsed.creation_date = now;
    }
    const rewrittenJsonWithDates = JSON.stringify({ ...parsed, spec, spec_version: specVersion });
    console.debug('[import] importCharacter entered', {
      name: parsed.name,
      pngDataSize: pngData.length,
      pngDataFirstBytes: pngData.subarray(0, 16).toString('hex'),
      destPath,
    });

    let effectivePngData: Buffer;
    let alreadyHadMetadata = false;
    try {
      const result = await ensurePngWithCardData(pngData, rewrittenJsonWithDates);
      effectivePngData = result.pngBuffer;
      alreadyHadMetadata = result.alreadyHadMetadata;
      console.debug('[import] image normalized', {
        converted: effectivePngData !== pngData,
        alreadyHadMetadata,
        outputSize: effectivePngData.length,
      });
    } catch (err) {
      console.debug('[import] image normalization failed — using placeholder', {
        error: err instanceof Error ? err.message : String(err),
      });
      effectivePngData = await generatePlaceholderPng();
    }

    if (!alreadyHadMetadata) {
      await writeCharacterCard(effectivePngData, rewrittenJsonWithDates, destPath);
    } else {
      const outDir = path.dirname(destPath);
      await import('node:fs/promises').then((fs) => fs.mkdir(outDir, { recursive: true }));
      await import('node:fs/promises').then((fs) => fs.writeFile(destPath, effectivePngData));
    }

    const destFile = Bun.file(destPath);
    console.debug('[import] after writeCharacterCard', {
      destExists: await destFile.exists(),
      destSize: await destFile.exists() ? destFile.size : 0,
    });
    await writeCharacterThumbnail(destPath, userId, fileName).catch((err) =>
      console.debug('[character] thumbnail op skipped', { op: 'import', userId, fileName, err }),
    );

    const sourceCreation = parsed.creation_date;
    const createDate = new Date(sourceCreation).toISOString();

    const result = await db
      .insert(characters)
      .values({
        name: parsed.name,
        avatar: fileName,
        fileName,
        jsonData: rewrittenJsonWithDates,
        spec,
        specVersion,
        tags: parsed.tags ?? [],
        creator: parsed.creator ?? '',
        characterVersion: parsed.character_version ?? '',
        createDate,
        dateAdded: now,
        dateLastChat: 0,
        chatSize: 0,
        dataSize: Buffer.from(rewrittenJsonWithDates).length,
        fav: false,
        userId,
      })
      .returning();

    return Number(result[0]!.id);
  }

  async exportCharacter(
    id: number,
    userId: string,
    format: 'png' | 'json' | 'yaml',
  ): Promise<{ data: Buffer; mimeType: string; fileName: string }> {
    const row = await db
      .select()
      .from(characters)
      .where(and(eq(characters.id, id), eq(characters.userId, userId)))
      .limit(1);
    if (row.length === 0) {
      throw new NotFoundError(`Character with id ${id}`);
    }
    const charRow = row[0]!;

    if (format === 'png') {
      const pngPath = path.join(getUserCharacterPath(userId), charRow.avatar);
      const pngData = await readFile(pngPath);
      return {
        data: pngData,
        mimeType: 'image/png',
        fileName: charRow.fileName,
      };
    }

    const jsonData = charRow.jsonData;
    if (format === 'json') {
      return {
        data: Buffer.from(jsonData),
        mimeType: 'application/json',
        fileName: charRow.fileName.replace('.png', '.json'),
      };
    }

    const parsed = JSON.parse(jsonData) as Record<string, unknown>;
    const yamlStr = yaml.stringify(parsed);
    return {
      data: Buffer.from(yamlStr),
      mimeType: 'text/yaml',
      fileName: charRow.fileName.replace('.png', '.yaml'),
    };
  }
}

export const characterService = new CharacterService();
