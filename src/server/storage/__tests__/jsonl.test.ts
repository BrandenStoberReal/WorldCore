import { describe, it, expect, beforeEach } from 'bun:test';
import {
  readJsonl,
  writeJsonl,
  appendJsonlLine,
  readFirstLine,
  readLastLine,
  readJsonlStream,
} from '../jsonl';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { DATA_ROOT } from '@/server/storage/paths';

const testDir = path.join(DATA_ROOT, '_test_jsonl');

interface TestRecord {
  id: number;
  name: string;
  value: string;
}

beforeEach(async () => {
  await rm(testDir, { recursive: true, force: true }).catch(() => {});
  await mkdir(testDir, { recursive: true });
});

describe('jsonl', () => {
  it('write and read JSONL', async () => {
    const records: TestRecord[] = [
      { id: 1, name: 'first', value: 'a' },
      { id: 2, name: 'second', value: 'b' },
      { id: 3, name: 'third', value: 'c' },
    ];
    const filePath = path.join(testDir, 'test.jsonl');
    await writeJsonl(filePath, records);
    const result = await readJsonl<TestRecord>(filePath);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ id: 1, name: 'first', value: 'a' });
    expect(result[1]).toEqual({ id: 2, name: 'second', value: 'b' });
    expect(result[2]).toEqual({ id: 3, name: 'third', value: 'c' });
  });

  it('append a line and verify count increased', async () => {
    const filePath = path.join(testDir, 'append.jsonl');
    await writeJsonl(filePath, [{ id: 1, name: 'initial', value: 'x' }]);
    await appendJsonlLine(filePath, { id: 2, name: 'appended', value: 'y' });
    const result = await readJsonl<TestRecord>(filePath);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({ id: 2, name: 'appended', value: 'y' });
  });

  it('append to non-existent file', async () => {
    const filePath = path.join(testDir, 'new.jsonl');
    await appendJsonlLine(filePath, { id: 1, name: 'first', value: 'z' });
    const result = await readJsonl<TestRecord>(filePath);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: 1, name: 'first', value: 'z' });
  });

  it('read first line', async () => {
    const filePath = path.join(testDir, 'first.jsonl');
    await writeJsonl(filePath, [
      { id: 1, name: 'first', value: 'a' },
      { id: 2, name: 'second', value: 'b' },
    ]);
    const first = await readFirstLine(filePath);
    expect(first).toBe('{"id":1,"name":"first","value":"a"}');
  });

  it('read last line', async () => {
    const filePath = path.join(testDir, 'last.jsonl');
    await writeJsonl(filePath, [
      { id: 1, name: 'first', value: 'a' },
      { id: 2, name: 'second', value: 'b' },
      { id: 3, name: 'third', value: 'c' },
    ]);
    const last = await readLastLine(filePath);
    expect(last).toBe('{"id":3,"name":"third","value":"c"}');
  });

  it('read last line from single-line file', async () => {
    const filePath = path.join(testDir, 'single.jsonl');
    await writeJsonl(filePath, [{ id: 1, name: 'only', value: 'o' }]);
    const last = await readLastLine(filePath);
    expect(last).toBe('{"id":1,"name":"only","value":"o"}');
  });

  it('stream read JSONL', async () => {
    const filePath = path.join(testDir, 'stream.jsonl');
    const records: TestRecord[] = [
      { id: 1, name: 'a', value: '1' },
      { id: 2, name: 'b', value: '2' },
      { id: 3, name: 'c', value: '3' },
    ];
    await writeJsonl(filePath, records);
    const stream = await readJsonlStream<TestRecord>(filePath);
    const results: TestRecord[] = [];
    for await (const record of stream) {
      results.push(record);
    }
    expect(results).toHaveLength(3);
    expect(results).toEqual(records);
  });
});
