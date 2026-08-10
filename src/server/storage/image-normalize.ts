import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readPngTextChunks } from './png-metadata';

const SIGNATURES = {
  png: [0x89, 0x50, 0x4e, 0x47],
  jpeg: [0xff, 0xd8, 0xff],
  webp_riff: [0x52, 0x49, 0x46, 0x46],
  webp_webp: [0x57, 0x45, 0x42, 0x50],
  gif: [0x47, 0x49, 0x46],
  bmp: [0x42, 0x4d],
} as const;

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'bmp' | 'unknown';

export function detectImageFormat(data: Buffer | Uint8Array): ImageFormat {
  if (data.length < 12) return 'unknown';
  if (matchBytes(data, SIGNATURES.png, 0)) return 'png';
  if (matchBytes(data, SIGNATURES.jpeg, 0)) return 'jpeg';
  if (
    matchBytes(data, SIGNATURES.webp_riff, 0) &&
    matchBytes(data, SIGNATURES.webp_webp, 8)
  ) {
    return 'webp';
  }
  if (matchBytes(data, SIGNATURES.gif, 0)) return 'gif';
  if (matchBytes(data, SIGNATURES.bmp, 0)) return 'bmp';
  return 'unknown';
}

function matchBytes(data: Buffer | Uint8Array, signature: readonly number[], offset: number): boolean {
  for (let i = 0; i < signature.length; i++) {
    if (data[offset + i] !== signature[i]) return false;
  }
  return true;
}

export function hasEmbeddedCardData(pngBuffer: Buffer): boolean {
  const textChunks = readPngTextChunks(pngBuffer);
  return textChunks.has('chara') || textChunks.has('ccv3');
}

export async function normalizeToPng(
  data: Buffer,
  options?: { skipIfPngWithMetadata?: boolean },
): Promise<{ pngBuffer: Buffer; converted: boolean; hadMetadata: boolean }> {
  const format = detectImageFormat(data);

  if (format === 'png') {
    const hadMetadata = hasEmbeddedCardData(data);
    if (options?.skipIfPngWithMetadata && hadMetadata) {
      return { pngBuffer: data, converted: false, hadMetadata: true };
    }
    return { pngBuffer: data, converted: false, hadMetadata };
  }

  if (format === 'unknown') {
    throw new Error(`Unrecognized image format (first bytes: ${data.subarray(0, 16).toString('hex')})`);
  }

  const image = await loadImage(data);
  if (image.width === 0 || image.height === 0) {
    throw new Error(`Invalid image dimensions: ${image.width}x${image.height}`);
  }

  const c = createCanvas(image.width, image.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const pngBuffer = Buffer.from(c.toBuffer('image/png'));

  return { pngBuffer, converted: true, hadMetadata: false };
}

export async function ensurePngWithCardData(
  imageData: Buffer,
  jsonData: string,
): Promise<{ pngBuffer: Buffer; alreadyHadMetadata: boolean }> {
  const { pngBuffer, hadMetadata } = await normalizeToPng(imageData);

  if (hadMetadata) {
    return { pngBuffer, alreadyHadMetadata: true };
  }

  return { pngBuffer, alreadyHadMetadata: false };
}
