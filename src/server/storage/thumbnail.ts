import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ValidationError } from '@/server/errors';

export async function generateThumbnail(
  sourcePath: string,
  outputDir: string,
  width: number = 200,
): Promise<string> {
  const imageBuf = await fs.readFile(sourcePath);
  const image = await loadImage(imageBuf);
  if (image.width === 0 || image.height === 0) {
    throw new ValidationError('Invalid image dimensions');
  }
  const height = Math.round(width * (image.height / image.width));
  const c = createCanvas(width, height);
  const ctx = c.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);
  const baseName = path.basename(sourcePath, path.extname(sourcePath));
  const thumbName = `thumb_${baseName}.png`;
  const outputPath = path.join(outputDir, thumbName);
  const buffer = Buffer.from(c.toBuffer('image/png'));
  await fs.writeFile(outputPath, buffer);
  return thumbName;
}
