import fs from "node:fs/promises"
import fsSync, { type Stats } from "node:fs"
import path from "node:path"

export async function readFile(filePath: string): Promise<Buffer>
export async function readFile(filePath: string, encoding: "utf-8"): Promise<string>
export async function readFile(filePath: string, encoding?: "utf-8"): Promise<string | Buffer> {
  return fs.readFile(filePath, encoding) as unknown as string | Buffer
}

export async function writeFile(filePath: string, data: string | Buffer): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(filePath, data)
}

export async function writeFileAtomic(filePath: string, data: string | Buffer): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  const tmpPath = filePath + ".tmp"
  await fs.writeFile(tmpPath, data)
  await fs.rename(tmpPath, filePath)
}

export async function removeFile(filePath: string): Promise<void> {
  await fs.unlink(filePath).catch(() => {})
}

export async function listFiles(dir: string, extension?: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && (!extension || e.name.endsWith(extension)))
    .map((e) => e.name)
}

export function existsSync(filePath: string): boolean {
  return fsSync.existsSync(filePath)
}

export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export type fsStats = Stats

export async function stat(filePath: string): Promise<fsStats> {
  return fs.stat(filePath)
}

export async function copyFile(src: string, dest: string): Promise<void> {
  const dir = path.dirname(dest)
  await fs.mkdir(dir, { recursive: true })
  await fs.copyFile(src, dest)
}

export async function rename(oldPath: string, newPath: string): Promise<void> {
  const dir = path.dirname(newPath)
  await fs.mkdir(dir, { recursive: true })
  await fs.rename(oldPath, newPath)
}

export async function mkdir(dir: string, options?: { recursive?: boolean }): Promise<void> {
  await fs.mkdir(dir, options)
}
