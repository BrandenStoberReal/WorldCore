import { rm } from 'node:fs/promises';
import { ValidationError } from '../errors';

interface SpawnOpts {
  dir: string;
  args: string[];
  timeoutMs?: number;
}

async function gitSpawn({
  dir,
  args,
  timeoutMs,
}: SpawnOpts): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn({
    cmd: ['git', '-C', dir, ...args],
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: timeoutMs ?? 60000,
    killSignal: 'SIGKILL',
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { exitCode, stdout: stdout.trim(), stderr: stderr.trim() };
}

export function validateGitUrl(url: string): void {
  if (/^[a-z]+:\/\//i.test(url)) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new ValidationError({ message: `Invalid git URL: ${url}` });
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new ValidationError({
        message: `Invalid git URL: only http(s) supported, got ${parsed.protocol}`,
      });
    }
  }
}

function validateBranchRef(branch: string): void {
  if (!/^[A-Za-z0-9._\/-]+$/.test(branch) || branch.startsWith('-')) {
    throw new ValidationError({ message: `Invalid git branch: ${branch}` });
  }
}

export async function cloneRepo(
  url: string,
  dest: string,
  opts?: { branch?: string; timeoutMs?: number },
): Promise<{ headHash: string }> {
  validateGitUrl(url);
  const cloneArgs = ['clone', '--depth', '1'];
  if (opts?.branch) {
    validateBranchRef(opts.branch);
    cloneArgs.push('--branch', opts.branch);
  }
  cloneArgs.push('--', url, dest);
  const { exitCode, stderr } = await gitSpawn({
    dir: '.',
    args: cloneArgs,
    timeoutMs: opts?.timeoutMs ?? 60000,
  });
  if (exitCode !== 0) {
    throw new Error(`git clone failed (${exitCode}): ${stderr.slice(0, 200)}`);
  }
  const {
    exitCode: headCode,
    stdout: headHash,
    stderr: headErr,
  } = await gitSpawn({
    dir: dest,
    args: ['rev-parse', 'HEAD'],
    timeoutMs: opts?.timeoutMs ?? 60000,
  });
  if (headCode !== 0) {
    throw new Error(`git rev-parse failed (${headCode}): ${headErr.slice(0, 200)}`);
  }
  return { headHash };
}

export async function fetchAndPull(
  dir: string,
  branch: string,
  opts?: { timeoutMs?: number },
): Promise<{ updated: boolean; newHash: string; oldHash: string }> {
  validateBranchRef(branch);
  const timeout = opts?.timeoutMs ?? 30000;

  const {
    exitCode: oldCode,
    stdout: oldHash,
    stderr: oldErr,
  } = await gitSpawn({ dir, args: ['rev-parse', 'HEAD'], timeoutMs: timeout });
  if (oldCode !== 0) {
    throw new Error(`git rev-parse HEAD failed (${oldCode}): ${oldErr.slice(0, 200)}`);
  }

  const { exitCode: fetchCode, stderr: fetchErr } = await gitSpawn({
    dir,
    args: ['fetch', 'origin', branch],
    timeoutMs: timeout,
  });
  if (fetchCode !== 0) {
    throw new Error(`git fetch failed (${fetchCode}): ${fetchErr.slice(0, 200)}`);
  }

  const {
    exitCode: remoteCode,
    stdout: remoteHash,
    stderr: remoteErr,
  } = await gitSpawn({
    dir,
    args: ['rev-parse', `origin/${branch}`],
    timeoutMs: timeout,
  });
  if (remoteCode !== 0) {
    throw new Error(
      `git rev-parse origin/${branch} failed (${remoteCode}): ${remoteErr.slice(0, 200)}`,
    );
  }

  if (remoteHash !== oldHash) {
    const { exitCode: pullCode, stderr: pullErr } = await gitSpawn({
      dir,
      args: ['pull', '--ff-only', 'origin', branch],
      timeoutMs: timeout,
    });
    if (pullCode !== 0) {
      throw new Error(`git pull failed (${pullCode}): ${pullErr.slice(0, 200)}`);
    }
    return { updated: true, newHash: remoteHash, oldHash };
  }

  return { updated: false, newHash: oldHash, oldHash };
}

export async function getCurrentHead(dir: string): Promise<string> {
  const { exitCode, stdout, stderr } = await gitSpawn({ dir, args: ['rev-parse', 'HEAD'] });
  if (exitCode !== 0) {
    throw new Error(`git rev-parse HEAD failed (${exitCode}): ${stderr.slice(0, 200)}`);
  }
  return stdout;
}

export async function getDefaultBranch(dir: string): Promise<string> {
  const { exitCode, stdout } = await gitSpawn({
    dir,
    args: ['symbolic-ref', 'refs/remotes/origin/HEAD'],
  });
  if (exitCode === 0 && stdout) {
    return stdout.replace('refs/remotes/origin/', '');
  }
  return 'main';
}

export async function rmrf(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}
