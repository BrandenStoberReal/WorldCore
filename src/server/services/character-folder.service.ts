import path from 'node:path';
import fs from 'node:fs/promises';
import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { characters } from '@/server/db/schema';
import { getUserCharacterPath } from '@/server/storage/paths';
import { safePathWithin } from '@/server/util/safePath';
import { readCharacterCard } from '@/server/storage/png-metadata';

export interface OrphanCharacterFile {
  fileName: string;
  absolutePath: string;
  sizeBytes: number;
  hasEmbeddedCard: boolean;
  embeddedName?: string;
  reason: 'no_db_row' | 'plain_png';
}

export interface DeleteOrphansResult {
  deleted: string[];
  skipped: Array<{ path: string; reason: string }>;
}

export class CharacterFolderService {
  /**
   * Scan the user's characters/ directory for PNG files that have no matching
   * row in the `characters` table. The on-disk filename is compared DIRECTLY to
   * `characters.fileName` — no normalization.
   */
  async listOrphans(userId: string): Promise<OrphanCharacterFile[]> {
    const userDir = getUserCharacterPath(userId);

    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(userDir, { withFileTypes: true });
    } catch {
      // Directory does not exist (or unreadable) — no orphans.
      return [];
    }

    const pngFiles = entries.filter(
      (e) =>
        e.isFile() &&
        e.name.toLowerCase().endsWith('.png') &&
        !e.name.toLowerCase().startsWith('thumb_'),
    );

    // Targeted column select — do NOT use getAll(userId) / getAll(userId, true)
    // (ShallowCharacter does not expose fileName directly).
    const rows = await db
      .select({ fileName: characters.fileName })
      .from(characters)
      .where(eq(characters.userId, userId));
    const dbFileNames = new Set(rows.map((r) => r.fileName));

    const orphans: OrphanCharacterFile[] = [];

    for (const entry of pngFiles) {
      const fileName = entry.name;
      if (dbFileNames.has(fileName)) continue;

      const absolutePath = path.join(userDir, fileName);

      let sizeBytes = 0;
      try {
        const stats = await fs.stat(absolutePath);
        sizeBytes = stats.size;
      } catch {
        // Stat failed — skip this file entirely (race / unreadable).
        continue;
      }

      let hasEmbeddedCard = false;
      let embeddedName: string | undefined;

      try {
        const raw = await readCharacterCard(absolutePath);
        if (raw !== undefined) {
          hasEmbeddedCard = true;
          try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            if (typeof parsed.name === 'string') {
              embeddedName = parsed.name;
            }
          } catch {
            // Has a card chunk but it isn't valid JSON — keep hasEmbeddedCard
            // true, leave embeddedName undefined.
          }
        }
      } catch {
        // Read error — classify as plain PNG (no embedded card).
        hasEmbeddedCard = false;
      }

      orphans.push({
        fileName,
        absolutePath,
        sizeBytes,
        hasEmbeddedCard,
        embeddedName,
        reason: hasEmbeddedCard ? 'no_db_row' : 'plain_png',
      });
    }

    orphans.sort((a, b) => a.fileName.localeCompare(b.fileName));
    return orphans;
  }

  /**
   * Delete the given absolute paths from the user's characters/ directory.
   * Built for safety: every path is re-validated against the user dir AND
   * re-queried against the DB (TOCTOU) before deletion.
   */
  async deleteOrphans(userId: string, absolutePaths: string[]): Promise<DeleteOrphansResult> {
    const userDir = getUserCharacterPath(userId);
    const deleted: string[] = [];
    const skipped: Array<{ path: string; reason: string }> = [];

    for (const requestedPath of absolutePaths) {
      const safe = safePathWithin(userDir, requestedPath);
      if (safe === null) {
        skipped.push({ path: requestedPath, reason: 'outside user directory' });
        continue;
      }

      const baseName = path.basename(safe);
      if (!baseName.toLowerCase().endsWith('.png')) {
        skipped.push({ path: requestedPath, reason: 'not a .png file' });
        continue;
      }

      // TOCTOU re-validation: a row may have been imported since the scan.
      const existing = await db
        .select({ fileName: characters.fileName })
        .from(characters)
        .where(and(eq(characters.userId, userId), eq(characters.fileName, baseName)))
        .limit(1);
      if (existing.length > 0) {
        skipped.push({ path: requestedPath, reason: 'file has been imported since scan' });
        continue;
      }

      try {
        await fs.unlink(safe);
        deleted.push(safe);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        const message = (err as Error).message ?? 'unknown error';
        if (code === 'ENOENT') {
          skipped.push({ path: requestedPath, reason: 'file already gone' });
        } else {
          skipped.push({ path: requestedPath, reason: `delete failed: ${message}` });
        }
      }
    }

    return { deleted, skipped };
  }
}

export const characterFolderService = new CharacterFolderService();
