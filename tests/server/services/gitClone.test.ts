import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  cloneRepo,
  fetchAndPull,
  getCurrentHead,
  validateGitUrl,
  rmrf,
} from '../../../src/server/services/gitClone.service';
import { ValidationError } from '../../../src/server/errors';

function git(args: string[], opts?: { cwd?: string; env?: Record<string, string> }) {
  const proc = Bun.spawnSync({
    cmd: ['git', ...args],
    cwd: opts?.cwd,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 'test@test',
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 'test@test',
      ...opts?.env,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  return {
    exitCode: proc.exitCode,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
}

function initSourceRepo(dir: string) {
  git(['init', '-b', 'main', dir]);
  git(['commit', '-m', 'init', '--allow-empty', '--no-gpg-sign'], { cwd: dir });
}

let srcDir: string;
let destDir: string;

beforeEach(() => {
  srcDir = mkdtempSync(join(tmpdir(), 'wc-git-src-'));
  destDir = mkdtempSync(join(tmpdir(), 'wc-git-dest-'));
});

afterEach(async () => {
  await rmrf(srcDir);
  await rmrf(destDir);
});

describe('cloneRepo', () => {
  it('clones a repo and returns headHash matching source', async () => {
    initSourceRepo(srcDir);
    const sourceHead = git(['rev-parse', 'HEAD'], { cwd: srcDir }).stdout.trim();
    const { headHash } = await cloneRepo(srcDir, destDir);
    expect(headHash).toBe(sourceHead);
  });

  it('clones a specific branch', async () => {
    initSourceRepo(srcDir);
    git(['checkout', '-b', 'feature'], { cwd: srcDir });
    git(['commit', '-m', 'feature commit', '--no-gpg-sign'], { cwd: srcDir });
    const featureHead = git(['rev-parse', 'HEAD'], { cwd: srcDir }).stdout.trim();
    const { headHash } = await cloneRepo(srcDir, destDir, { branch: 'feature' });
    expect(headHash).toBe(featureHead);
  });
});

describe('fetchAndPull', () => {
  it('returns updated=true when upstream has new commits', async () => {
    initSourceRepo(srcDir);
    await cloneRepo(srcDir, destDir);
    const oldHash = await getCurrentHead(destDir);

    git(['commit', '-m', 'second', '--allow-empty', '--no-gpg-sign'], { cwd: srcDir });

    const result = await fetchAndPull(destDir, 'main');
    expect(result.updated).toBe(true);
    expect(result.oldHash).toBe(oldHash);
    expect(result.newHash).not.toBe(oldHash);
  });

  it('returns updated=false when no upstream changes', async () => {
    initSourceRepo(srcDir);
    await cloneRepo(srcDir, destDir);
    const oldHash = await getCurrentHead(destDir);

    const result = await fetchAndPull(destDir, 'main');
    expect(result.updated).toBe(false);
    expect(result.oldHash).toBe(oldHash);
    expect(result.newHash).toBe(oldHash);
  });
});

describe('getCurrentHead', () => {
  it('returns the HEAD hash of a repo', async () => {
    initSourceRepo(srcDir);
    await cloneRepo(srcDir, destDir);
    const head = await getCurrentHead(destDir);
    const expected = git(['rev-parse', 'HEAD'], { cwd: srcDir }).stdout.trim();
    expect(head).toBe(expected);
  });
});

describe('validateGitUrl', () => {
  it('accepts https URLs', () => {
    expect(() => validateGitUrl('https://github.com/user/repo.git')).not.toThrow();
  });

  it('accepts http URLs', () => {
    expect(() => validateGitUrl('http://github.com/user/repo.git')).not.toThrow();
  });

  it('rejects file:// URLs', () => {
    expect(() => validateGitUrl('file:///tmp/repo')).toThrow(ValidationError);
  });

  it('rejects ssh:// URLs', () => {
    expect(() => validateGitUrl('ssh://git@github.com/user/repo.git')).toThrow(ValidationError);
  });

  it('allows bare local paths (no scheme)', () => {
    expect(() => validateGitUrl('/tmp/local-repo')).not.toThrow();
    expect(() => validateGitUrl('../relative/repo')).not.toThrow();
  });
});

describe('rmrf', () => {
  it('removes a directory recursively', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'wc-rmrf-'));
    Bun.spawnSync({ cmd: ['touch', join(dir, 'file.txt')], stdout: 'ignore', stderr: 'pipe' });
    await rmrf(dir);
    expect(
      () => Bun.spawnSync({ cmd: ['ls', dir], stdout: 'pipe', stderr: 'pipe' }).exitCode,
    ).not.toBe(0);
  });
});
