import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { writeFileAtomic } from './fs';

const appendLocks = new Map<string, Promise<void>>();

async function withAppendLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const prev = appendLocks.get(filePath) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  appendLocks.set(filePath, next.then(() => {}, () => {}));
  return next;
}

export async function readJsonl<T>(filePath: string): Promise<T[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  return content
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}

export async function writeJsonl<T>(filePath: string, records: T[]): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const data = records.map((r) => JSON.stringify(r)).join('\n');
  await fs.writeFile(filePath, data, 'utf-8');
}

export async function appendJsonlLine<T>(filePath: string, record: T): Promise<void> {
  await withAppendLock(filePath, async () => {
    const line = JSON.stringify(record);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    let prefix = '\n';
    try {
      const { size } = await fs.stat(filePath);
      if (size === 0) prefix = '';
    } catch {
      prefix = '';
    }

    await fs.appendFile(filePath, prefix + line, 'utf-8');
  });
}

export async function readFirstLine(filePath: string): Promise<string | null> {
  const stream = createReadStream(filePath, { encoding: 'utf-8', highWaterMark: 1024 });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    return line;
  }
  return null;
}

export async function readLastLine(filePath: string): Promise<string | null> {
  const CHUNK_SIZE = 4096;
  try {
    const file = Bun.file(filePath);
    const fileSize = file.size;
    if (fileSize === 0) return null;

    let pos = fileSize;
    let tail = '';

    while (pos > 0) {
      const readSize = Math.min(CHUNK_SIZE, pos);
      pos -= readSize;
      const slice = await file.slice(pos, pos + readSize).arrayBuffer();
      tail = Buffer.from(slice).toString('utf-8') + tail;

      if (tail.indexOf('\n') !== -1) {
        const lastNl = tail.lastIndexOf('\n');
        return tail.slice(lastNl + 1).trimEnd() || null;
      }
    }

    return tail.trimEnd() || null;
  } catch {
    return null;
  }
}

export async function readJsonlStream<T>(filePath: string): Promise<AsyncIterable<T>> {
  const stream = createReadStream(filePath, { encoding: 'utf-8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  return {
    async *[Symbol.asyncIterator]() {
      for await (const line of rl) {
        if (line.trim()) {
          yield JSON.parse(line) as T;
        }
      }
    },
  };
}
