import { describe, it, expect } from 'bun:test';
import { createCanvas } from '@napi-rs/canvas';
import { readFile } from 'node:fs/promises';
import {
  detectImageFormat,
  hasEmbeddedCardData,
  normalizeToPng,
  ensurePngWithCardData,
} from '../image-normalize';
import { writeCharacterCard } from '../png-metadata';

async function createTestPng(): Promise<Buffer> {
  const c = createCanvas(1, 1);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, 1, 1);
  return Buffer.from(c.toBuffer('image/png'));
}

async function createTestPngWithMetadata(): Promise<Buffer> {
  const png = await createTestPng();
  const jsonData = JSON.stringify({ name: 'Test', description: 'Test character' });
  const outPath = '/tmp/test_meta.png';
  await writeCharacterCard(png, jsonData, outPath);
  return readFile(outPath);
}

async function createTestJpeg(): Promise<Buffer> {
  const c = createCanvas(2, 2);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(0, 0, 2, 2);
  return Buffer.from(c.toBuffer('image/jpeg'));
}

async function createTestWebP(): Promise<Buffer> {
  const c = createCanvas(3, 3);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0000ff';
  ctx.fillRect(0, 0, 3, 3);
  return Buffer.from(c.toBuffer('image/webp'));
}

describe('detectImageFormat', () => {
  it('detects PNG', async () => {
    const png = await createTestPng();
    expect(detectImageFormat(png)).toBe('png');
  });

  it('detects JPEG', async () => {
    const jpeg = await createTestJpeg();
    expect(detectImageFormat(jpeg)).toBe('jpeg');
  });

  it('detects WebP', async () => {
    const webp = await createTestWebP();
    expect(detectImageFormat(webp)).toBe('webp');
  });

  it('returns unknown for empty buffer', () => {
    expect(detectImageFormat(Buffer.alloc(0))).toBe('unknown');
  });

  it('returns unknown for random bytes', () => {
    expect(detectImageFormat(Buffer.from([0x01, 0x02, 0x03, 0x04]))).toBe('unknown');
  });
});

describe('hasEmbeddedCardData', () => {
  it('returns false for plain PNG', async () => {
    const png = await createTestPng();
    expect(hasEmbeddedCardData(png)).toBe(false);
  });

  it('returns true for PNG with chara chunk', async () => {
    const pngWithMeta = await createTestPngWithMetadata();
    expect(hasEmbeddedCardData(pngWithMeta)).toBe(true);
  });
});

describe('normalizeToPng', () => {
  it('returns PNG as-is without conversion', async () => {
    const png = await createTestPng();
    const result = await normalizeToPng(png);
    expect(result.pngBuffer).toBe(png);
    expect(result.converted).toBe(false);
    expect(result.hadMetadata).toBe(false);
  });

  it('converts JPEG to PNG', async () => {
    const jpeg = await createTestJpeg();
    const result = await normalizeToPng(jpeg);
    expect(result.converted).toBe(true);
    expect(result.hadMetadata).toBe(false);
    expect(detectImageFormat(result.pngBuffer)).toBe('png');
    expect(result.pngBuffer.length).toBeGreaterThan(0);
  });

  it('converts WebP to PNG', async () => {
    const webp = await createTestWebP();
    const result = await normalizeToPng(webp);
    expect(result.converted).toBe(true);
    expect(result.hadMetadata).toBe(false);
    expect(detectImageFormat(result.pngBuffer)).toBe('png');
    expect(result.pngBuffer.length).toBeGreaterThan(0);
  });

  it('throws for unrecognized format', async () => {
    const garbage = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
    await expect(normalizeToPng(garbage)).rejects.toThrow('Unrecognized image format');
  });

  it('preserves PNG metadata flag', async () => {
    const pngWithMeta = await createTestPngWithMetadata();
    const result = await normalizeToPng(pngWithMeta);
    expect(result.hadMetadata).toBe(true);
    expect(result.converted).toBe(false);
  });

  it('skipIfPngWithMetadata returns early for PNG with metadata', async () => {
    const pngWithMeta = await createTestPngWithMetadata();
    const result = await normalizeToPng(pngWithMeta, { skipIfPngWithMetadata: true });
    expect(result.hadMetadata).toBe(true);
    expect(result.converted).toBe(false);
    expect(result.pngBuffer).toBe(pngWithMeta);
  });
});

describe('ensurePngWithCardData', () => {
  it('returns alreadyHadMetadata=true for PNG with embedded data', async () => {
    const pngWithMeta = await createTestPngWithMetadata();
    const result = await ensurePngWithCardData(pngWithMeta, '{}');
    expect(result.alreadyHadMetadata).toBe(true);
  });

  it('returns alreadyHadMetadata=false for plain PNG', async () => {
    const png = await createTestPng();
    const result = await ensurePngWithCardData(png, '{}');
    expect(result.alreadyHadMetadata).toBe(false);
    expect(detectImageFormat(result.pngBuffer)).toBe('png');
  });

  it('converts WebP and returns alreadyHadMetadata=false', async () => {
    const webp = await createTestWebP();
    const result = await ensurePngWithCardData(webp, '{}');
    expect(result.alreadyHadMetadata).toBe(false);
    expect(detectImageFormat(result.pngBuffer)).toBe('png');
  });

  it('converts JPEG and returns alreadyHadMetadata=false', async () => {
    const jpeg = await createTestJpeg();
    const result = await ensurePngWithCardData(jpeg, '{}');
    expect(result.alreadyHadMetadata).toBe(false);
    expect(detectImageFormat(result.pngBuffer)).toBe('png');
  });
});
