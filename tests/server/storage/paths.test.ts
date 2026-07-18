import { describe, it, expect, afterAll } from 'bun:test';
import path from 'node:path';
import fs from 'node:fs';
import {
  DATA_ROOT,
  paths,
  getUserCharacterPath,
  ensureUserCharacterDir,
} from '../../../src/server/storage/paths';

const TEST_USER = 'test-user-for-dir-creation';

describe('getUserCharacterPath', () => {
  it('default-user path equals DATA_ROOT/default-user/characters and matches paths.characters', () => {
    const expected = path.join(DATA_ROOT, 'default-user', 'characters');
    expect(getUserCharacterPath('default-user')).toBe(expected);
    expect(getUserCharacterPath('default-user')).toBe(paths.characters);
  });

  it('user-abc path is a distinct absolute path under DATA_ROOT/user-abc/characters', () => {
    const abc = getUserCharacterPath('user-abc');
    const def = getUserCharacterPath('default-user');
    expect(abc).toBe(path.join(DATA_ROOT, 'user-abc', 'characters'));
    expect(abc).not.toBe(def);
    expect(path.isAbsolute(abc)).toBe(true);
    expect(abc.startsWith(path.join(DATA_ROOT, 'user-abc'))).toBe(true);
  });
});

describe('ensureUserCharacterDir', () => {
  afterAll(() => {
    // Clean up only the synthetic test dir; never touch default-user or real users.
    fs.rmSync(path.join(DATA_ROOT, TEST_USER), { recursive: true, force: true });
  });

  it('creates the directory if absent and is idempotent (no throw on re-call)', () => {
    const dir = getUserCharacterPath(TEST_USER);
    // Ensure clean slate
    fs.rmSync(path.join(DATA_ROOT, TEST_USER), { recursive: true, force: true });
    expect(fs.existsSync(dir)).toBe(false);

    expect(() => ensureUserCharacterDir(TEST_USER)).not.toThrow();
    expect(fs.existsSync(dir)).toBe(true);

    // Idempotent: calling again must not throw
    expect(() => ensureUserCharacterDir(TEST_USER)).not.toThrow();
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('does not throw when the dir already exists (default-user)', () => {
    // default-user/characters is created at boot by ensureUserDirs; must not throw.
    expect(() => ensureUserCharacterDir('default-user')).not.toThrow();
  });
});
