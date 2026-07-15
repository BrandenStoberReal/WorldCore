import path from 'node:path';
import { paths } from '@/server/storage/paths';
import { listFiles, removeFile, exists, stat } from '@/server/storage/fs';
import { handleFileUpload } from '@/server/storage/upload';
import { generateThumbnail } from '@/server/storage/thumbnail';
import { NotFoundError, ValidationError } from '@/server/errors';
import { safePathWithin } from '@/server/util/safePath';

const IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/bmp',
] as const;

export type AssetCategory = 'avatars' | 'backgrounds' | 'sprites' | 'assets' | 'files';

const CATEGORY_DIR_MAP: Record<AssetCategory, string> = {
  avatars: paths.avatars,
  backgrounds: paths.backgrounds,
  sprites: paths.sprites,
  assets: paths.assets,
  files: paths.files,
};

const CATEGORY_ALLOWED_TYPES: Record<AssetCategory, string[] | undefined> = {
  avatars: IMAGE_TYPES as unknown as string[],
  backgrounds: IMAGE_TYPES as unknown as string[],
  sprites: IMAGE_TYPES as unknown as string[],
  assets: undefined,
  files: undefined,
};

export type FileInfo = {
  fileName: string;
  path: string;
  size: number;
  mimeType: string;
  lastModified: number;
};

export class AssetService {
  async upload(
    formData: FormData,
    category: AssetCategory,
  ): Promise<{ fileName: string; path: string; mimeType: string }> {
    const destDir = CATEGORY_DIR_MAP[category];
    const allowedTypes = CATEGORY_ALLOWED_TYPES[category];
    const result = await handleFileUpload(formData, 'file', destDir, allowedTypes);
    return result;
  }

  async list(category: AssetCategory): Promise<FileInfo[]> {
    const dir = CATEGORY_DIR_MAP[category];
    const files = await listFiles(dir).catch(() => [] as string[]);
    const result: FileInfo[] = [];

    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        const stats = await stat(filePath);
        result.push({
          fileName: file,
          path: filePath,
          size: stats.size,
          mimeType: this.guessMimeType(file),
          lastModified: stats.mtimeMs,
        });
      } catch {
        // Skip files we can't stat
      }
    }

    return result;
  }

  async delete(category: AssetCategory, fileName: string): Promise<void> {
    const dir = CATEGORY_DIR_MAP[category];
    const safePath = safePathWithin(dir, fileName);
    if (!safePath) {
      throw new ValidationError('Invalid file path');
    }
    if (!(await exists(safePath))) {
      throw new NotFoundError(`File "${fileName}" in ${category}`);
    }
    await removeFile(safePath);
  }

  async generateThumbnailFor(
    fileName: string,
    category: AssetCategory,
    width?: number,
  ): Promise<string> {
    const dir = CATEGORY_DIR_MAP[category];
    const sourcePath = path.join(dir, fileName);
    if (!(await exists(sourcePath))) {
      throw new NotFoundError(`File "${fileName}" in ${category}`);
    }
    return generateThumbnail(sourcePath, dir, width);
  }

  async getImageMetadata(filePath: string): Promise<{
    width: number;
    height: number;
    mimeType: string;
    size: number;
  }> {
    if (!(await exists(filePath))) {
      throw new NotFoundError(`Image file "${filePath}"`);
    }
    const stats = await stat(filePath);
    const mime = this.guessMimeType(filePath);

    if (!IMAGE_TYPES.includes(mime as (typeof IMAGE_TYPES)[number])) {
      throw new ValidationError('Not a supported image format');
    }

    const { Jimp } = await import('jimp');
    const image = await Jimp.read(filePath);
    return {
      width: image.width,
      height: image.height,
      mimeType: mime,
      size: stats.size,
    };
  }

  private guessMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const map: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.json': 'application/json',
      '.txt': 'text/plain',
    };
    return map[ext] || 'application/octet-stream';
  }
}

export const assetService = new AssetService();
