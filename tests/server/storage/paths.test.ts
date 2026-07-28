import { describe, it, expect, afterAll } from 'bun:test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {
  DATA_ROOT,
  paths,
  getUserCharacterPath,
  ensureUserCharacterDir,
  getGlobalExtensionRoot,
  getGlobalExtensionPath,
  getUserExtensionRoot,
  getUserExtensionPath,
  ensureUserExtensionDir,
  safeExtensionPath,
} from '../../../src/server/storage/paths';
import { ValidationError } from '../../../src/server/errors';

const TEST_USER = 'test-user-for-dir-creation';
const EXT_TEST_USER = 'ext-test-user';

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

describe('getGlobalExtensionRoot', () => {
  it('returns DATA_ROOT/extensions', () => {
    expect(getGlobalExtensionRoot()).toBe(path.join(DATA_ROOT, 'extensions'));
  });
});

describe('getGlobalExtensionPath', () => {
  it('returns DATA_ROOT/extensions/<slug>', () => {
    expect(getGlobalExtensionPath('demo-ext')).toBe(
      path.join(DATA_ROOT, 'extensions', 'demo-ext'),
    );
  });

  it('throws ValidationError for uppercase slug', () => {
    expect(() => getGlobalExtensionPath('UPPER')).toThrow(ValidationError);
  });

  it('throws ValidationError for slug with dots', () => {
    expect(() => getGlobalExtensionPath('foo.bar')).toThrow(ValidationError);
  });

  it('throws ValidationError for parent-traversal slug', () => {
    expect(() => getGlobalExtensionPath('..')).toThrow(ValidationError);
  });
});

describe('getUserExtensionRoot', () => {
  it('returns DATA_ROOT/<userId>/extensions', () => {
    expect(getUserExtensionRoot('user1')).toBe(path.join(DATA_ROOT, 'user1', 'extensions'));
  });
});

describe('getUserExtensionPath', () => {
  it('returns DATA_ROOT/<userId>/extensions/<slug>', () => {
    expect(getUserExtensionPath('user1', 'demo-ext')).toBe(
      path.join(DATA_ROOT, 'user1', 'extensions', 'demo-ext'),
    );
  });

  it('throws ValidationError for parent-traversal slug', () => {
    expect(() => getUserExtensionPath('user1', '..')).toThrow(ValidationError);
  });

  it('throws ValidationError for uppercase slug', () => {
    expect(() => getUserExtensionPath('user1', 'MyExt')).toThrow(ValidationError);
  });
});

describe('ensureUserExtensionDir', () => {
  afterAll(() => {
    fs.rmSync(path.join(DATA_ROOT, EXT_TEST_USER), { recursive: true, force: true });
  });

  it('creates the extension dir and is idempotent', () => {
    const dir = getUserExtensionRoot(EXT_TEST_USER);
    fs.rmSync(path.join(DATA_ROOT, EXT_TEST_USER), { recursive: true, force: true });
    expect(fs.existsSync(dir)).toBe(false);

    expect(() => ensureUserExtensionDir(EXT_TEST_USER)).not.toThrow();
    expect(fs.existsSync(dir)).toBe(true);

    expect(() => ensureUserExtensionDir(EXT_TEST_USER)).not.toThrow();
    expect(fs.existsSync(dir)).toBe(true);
  });
});

describe('safeExtensionPath', () => {
  const root = path.join(os.tmpdir(), 'safe-ext-root-test');
  const sub = path.join(root, 'sub');

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('returns resolved absolute path for safe relative path', () => {
    expect(safeExtensionPath(root, 'sub/file.tsx')).toBe(sub + path.sep + 'file.tsx');
  });

  it('returns root itself for empty relative path', () => {
    expect(safeExtensionPath(root, '')).toBe(root);
  });

  it('throws ValidationError for path traversal', () => {
    expect(() => safeExtensionPath(root, '../../../etc/passwd')).toThrow(ValidationError);
  });

  it('throws ValidationError for absolute outside root', () => {
    expect(() => safeExtensionPath(root, '/etc/passwd')).toThrow(ValidationError);
  });
});
