import { describe, it, expect } from 'bun:test';
import { MIME_TYPES, resolveMimeType } from '@/server/mime';

describe('MIME_TYPES', () => {
  it('has at least the originally-shipped 17 entries', () => {
    // Lower bound only — adding new MIME entries must not break this test.
    // The exhaustive resolution tests below cover each individual entry.
    expect(Object.keys(MIME_TYPES).length).toBeGreaterThanOrEqual(17);
  });

  it('every entry resolves via resolveMimeType', () => {
    for (const [ext, mime] of Object.entries(MIME_TYPES)) {
      expect(resolveMimeType(`file${ext}`)).toBe(mime);
    }
  });
});

describe('resolveMimeType', () => {
  it('resolves .html', () => {
    expect(resolveMimeType('index.html')).toBe('text/html');
  });

  it('resolves .js (case-insensitive)', () => {
    expect(resolveMimeType('app.JS')).toBe('application/javascript');
  });

  it('resolves .css', () => {
    expect(resolveMimeType('style.css')).toBe('text/css');
  });

  it('resolves .css (mixed-case)', () => {
    expect(resolveMimeType('style.Css')).toBe('text/css');
  });

  it('resolves .svg', () => {
    expect(resolveMimeType('icon.svg')).toBe('image/svg+xml');
  });

  it('resolves .png', () => {
    expect(resolveMimeType('avatar.png')).toBe('image/png');
  });

  it('resolves .json', () => {
    expect(resolveMimeType('data.json')).toBe('application/json');
  });

  it('resolves .woff2', () => {
    expect(resolveMimeType('font.woff2')).toBe('font/woff2');
  });

  it('resolves .woff', () => {
    expect(resolveMimeType('font.woff')).toBe('font/woff');
  });

  it('resolves .ico', () => {
    expect(resolveMimeType('favicon.ico')).toBe('image/x-icon');
  });

  it('resolves .jpg', () => {
    expect(resolveMimeType('photo.jpg')).toBe('image/jpeg');
  });

  it('resolves .jpeg', () => {
    expect(resolveMimeType('photo.jpeg')).toBe('image/jpeg');
  });

  it('resolves .webp', () => {
    expect(resolveMimeType('image.webp')).toBe('image/webp');
  });

  it('resolves .gif', () => {
    expect(resolveMimeType('anim.gif')).toBe('image/gif');
  });

  it('resolves .map', () => {
    expect(resolveMimeType('bundle.js.map')).toBe('application/json');
  });

  it('resolves .mp3', () => {
    expect(resolveMimeType('audio.mp3')).toBe('audio/mpeg');
  });

  it('resolves .wav', () => {
    expect(resolveMimeType('sound.wav')).toBe('audio/wav');
  });

  it('resolves .txt', () => {
    expect(resolveMimeType('readme.txt')).toBe('text/plain');
  });

  it('falls back to application/octet-stream for unknown extension', () => {
    expect(resolveMimeType('file.unknownext')).toBe('application/octet-stream');
  });

  it('falls back to application/octet-stream for no extension', () => {
    expect(resolveMimeType('noextfile')).toBe('application/octet-stream');
  });
});
