import fs from "node:fs/promises"
import { createReadStream } from "node:fs"
import { createInterface } from "node:readline"
import path from "node:path"

export async function readJsonl<T>(filePath: string): Promise<T[]> {
  const content = await fs.readFile(filePath, "utf-8")
  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T)
}

export async function writeJsonl<T>(filePath: string, records: T[]): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  const data = records.map((r) => JSON.stringify(r)).join("\n")
  await fs.writeFile(filePath, data, "utf-8")
}

export async function appendJsonlLine<T>(filePath: string, record: T): Promise<void> {
  const line = JSON.stringify(record)
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  try {
    const stat = await fs.stat(filePath)
    if (stat.size > 0) {
      await fs.appendFile(filePath, "\n" + line, "utf-8")
    } else {
      await fs.appendFile(filePath, line, "utf-8")
    }
  } catch {
    await fs.writeFile(filePath, line, "utf-8")
  }
}

export async function readFirstLine(filePath: string): Promise<string | null> {
  const stream = createReadStream(filePath, { encoding: "utf-8", highWaterMark: 1024 })
  const rl = createInterface({ input: stream, crlfDelay: Infinity })
  for await (const line of rl) {
    return line
  }
  return null
}

export async function readLastLine(filePath: string): Promise<string | null> {
  const fd = await fs.open(filePath, "r")
  const statResult = await fd.stat()
  if (statResult.size === 0) {
    await fd.close()
    return null
  }
  let offset = statResult.size - 1
  let lastLine = ""
  while (offset >= 0) {
    const buf = Buffer.alloc(1)
    const readResult = await fd.read(buf, 0, 1, offset)
    if (readResult.bytesRead === 0) {
      break
    }
    if (buf[0] === 10) {
      break
    }
    lastLine = String.fromCharCode(buf[0]!) + lastLine
    offset--
  }
  await fd.close()
  return lastLine || null
}

export async function readJsonlStream<T>(filePath: string): Promise<AsyncIterable<T>> {
  const stream = createReadStream(filePath, { encoding: "utf-8" })
  const rl = createInterface({ input: stream, crlfDelay: Infinity })

  return {
    async *[Symbol.asyncIterator]() {
      for await (const line of rl) {
        if (line.trim()) {
          yield JSON.parse(line) as T
        }
      }
    },
  }
}
