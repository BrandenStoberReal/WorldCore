import fs from "node:fs/promises"
import path from "node:path"
import { DATA_ROOT } from "@/server/storage/paths"
import { readFile, writeFileAtomic, exists, mkdir } from "@/server/storage/fs"
import type { ExtensionInfo } from "@/shared/types/extensions"
import { NotFoundError, ConflictError } from "@/server/errors"

const EXTENSIONS_DIR = path.join(DATA_ROOT, "extensions")
const EXTENSIONS_SETTINGS_FILE = path.join(EXTENSIONS_DIR, "_enabled.json")
const GIT_TIMEOUT_MS = 30_000

async function runGit(
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), GIT_TIMEOUT_MS)

  const process = Bun.spawn(
    ["git", ...args],
    {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
      signal: controller.signal,
    },
  )

  const stdoutChunks: Uint8Array[] = []
  const stderrChunks: Uint8Array[] = []

  const stdoutPromise = (async () => {
    for await (const chunk of process.stdout) {
      stdoutChunks.push(chunk)
    }
  })()

  const stderrPromise = (async () => {
    for await (const chunk of process.stderr) {
      stderrChunks.push(chunk)
    }
  })()

  const exitCode = await process.exited
  await Promise.all([stdoutPromise, stderrPromise])
  clearTimeout(timeoutId)

  return {
    stdout: new TextDecoder().decode(Buffer.concat(stdoutChunks.map((c) => Buffer.from(c)))),
    stderr: new TextDecoder().decode(Buffer.concat(stderrChunks.map((c) => Buffer.from(c)))),
    exitCode,
  }
}

async function loadEnabledList(): Promise<string[]> {
  if (!(await exists(EXTENSIONS_SETTINGS_FILE))) {
    return []
  }
  try {
    const content = await readFile(EXTENSIONS_SETTINGS_FILE, "utf-8")
    return JSON.parse(content) as string[]
  } catch {
    return []
  }
}

async function saveEnabledList(list: string[]): Promise<void> {
  await writeFileAtomic(EXTENSIONS_SETTINGS_FILE, JSON.stringify(list, null, 2))
}

async function readManifest(extDir: string): Promise<Record<string, unknown>> {
  const manifestPath = path.join(extDir, "manifest.json")
  if (!(await exists(manifestPath))) {
    return {}
  }
  try {
    const content = await readFile(manifestPath, "utf-8")
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return {}
  }
}

async function getGitUrl(extDir: string): Promise<string | undefined> {
  try {
    const result = await runGit(["remote", "get-url", "origin"], extDir)
    if (result.exitCode === 0) {
      return result.stdout.trim()
    }
  } catch {
    // Not a git repo
  }
  return undefined
}

async function getLastUpdated(extDir: string): Promise<string | undefined> {
  try {
    const result = await runGit(["log", "-1", "--format=%aI"], extDir)
    if (result.exitCode === 0 && result.stdout.trim()) {
      return result.stdout.trim()
    }
  } catch {
    // Not a git repo or no commits
  }
  return undefined
}

async function removeDirectory(dirPath: string): Promise<void> {
  await fs.rm(dirPath, { recursive: true, force: true })
}

export class ExtensionsService {
  getExtensionsDirectory(): string {
    return EXTENSIONS_DIR
  }

  async listExtensions(): Promise<ExtensionInfo[]> {
    await mkdir(EXTENSIONS_DIR, { recursive: true })
    const enabledList = await loadEnabledList()

    const entries = await fs.readdir(EXTENSIONS_DIR, { withFileTypes: true })
    const extensions: ExtensionInfo[] = []

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name.startsWith(".")) {
        continue
      }

      const extDir = path.join(EXTENSIONS_DIR, entry.name)
      const manifest = await readManifest(extDir)
      const gitUrl = await getGitUrl(extDir)
      const lastUpdated = await getLastUpdated(extDir)

      const info: ExtensionInfo = {
        name: entry.name,
        displayName: (manifest.displayName as string) ?? entry.name,
        version: (manifest.version as string) ?? "0.0.0",
        description: (manifest.description as string) ?? "",
        author: (manifest.author as string) ?? "",
        enabled: enabledList.includes(entry.name),
        gitUrl: gitUrl ?? "",
        lastUpdated: lastUpdated ?? "",
        manifest,
      }
      extensions.push(info)
    }

    return extensions
  }

  async enableExtension(name: string): Promise<void> {
    const extDir = path.join(EXTENSIONS_DIR, name)
    if (!(await exists(extDir))) {
      throw new NotFoundError(`Extension "${name}"`)
    }

    const list = await loadEnabledList()
    if (!list.includes(name)) {
      list.push(name)
      await saveEnabledList(list)
    }
  }

  async disableExtension(name: string): Promise<void> {
    const extDir = path.join(EXTENSIONS_DIR, name)
    if (!(await exists(extDir))) {
      throw new NotFoundError(`Extension "${name}"`)
    }

    const list = await loadEnabledList()
    const index = list.indexOf(name)
    if (index !== -1) {
      list.splice(index, 1)
      await saveEnabledList(list)
    }
  }

  async installExtension(url: string, targetDir?: string): Promise<ExtensionInfo> {
    const dirName = targetDir ?? this.extractRepoName(url)
    const extDir = path.join(EXTENSIONS_DIR, dirName)

    if (await exists(extDir)) {
      throw new ConflictError(`Extension "${dirName}" already exists`)
    }

    await mkdir(EXTENSIONS_DIR, { recursive: true })

    const result = await runGit(["clone", url, dirName], EXTENSIONS_DIR)
    if (result.exitCode !== 0) {
      throw new Error(`Failed to clone extension: ${result.stderr}`)
    }

    return this.buildExtensionInfo(dirName)
  }

  async uninstallExtension(name: string): Promise<void> {
    const extDir = path.join(EXTENSIONS_DIR, name)
    if (!(await exists(extDir))) {
      throw new NotFoundError(`Extension "${name}"`)
    }

    await removeDirectory(extDir)

    const list = await loadEnabledList()
    const index = list.indexOf(name)
    if (index !== -1) {
      list.splice(index, 1)
      await saveEnabledList(list)
    }
  }

  async updateExtension(name: string): Promise<ExtensionInfo> {
    const extDir = path.join(EXTENSIONS_DIR, name)
    if (!(await exists(extDir))) {
      throw new NotFoundError(`Extension "${name}"`)
    }

    const gitResult = await runGit(["pull"], extDir)
    if (gitResult.exitCode !== 0) {
      throw new Error(`Failed to update extension: ${gitResult.stderr}`)
    }

    return this.buildExtensionInfo(name)
  }

  async updateAllExtensions(): Promise<ExtensionInfo[]> {
    const extensions = await this.listExtensions()
    const results: ExtensionInfo[] = []

    for (const ext of extensions) {
      if (!ext.gitUrl) continue
      try {
        const updated = await this.updateExtension(ext.name)
        results.push(updated)
      } catch {
        results.push(ext)
      }
    }

    return results
  }

  private extractRepoName(url: string): string {
    const cleaned = url.replace(/\.git$/, "").replace(/\/+$/, "")
    const parts = cleaned.split("/")
    return parts[parts.length - 1] ?? "extension"
  }

  private async buildExtensionInfo(name: string): Promise<ExtensionInfo> {
    const extDir = path.join(EXTENSIONS_DIR, name)
    const manifest = await readManifest(extDir)
    const gitUrl = await getGitUrl(extDir)
    const lastUpdated = await getLastUpdated(extDir)
    const enabledList = await loadEnabledList()

    return {
      name,
      displayName: (manifest.displayName as string) ?? name,
      version: (manifest.version as string) ?? "0.0.0",
      description: (manifest.description as string) ?? "",
      author: (manifest.author as string) ?? "",
      enabled: enabledList.includes(name),
      gitUrl: gitUrl ?? "",
      lastUpdated: lastUpdated ?? "",
      manifest,
    }
  }
}

export const extensionsService = new ExtensionsService()
