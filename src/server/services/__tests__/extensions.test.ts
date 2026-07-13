import { describe, it, expect } from "bun:test"
import path from "node:path"
import fsPromises from "node:fs/promises"
import { ExtensionsService } from "@/server/services/extensions.service"
import * as fs from "@/server/storage/fs"
import { DATA_ROOT } from "@/server/storage/paths"

const TEST_EXT_NAME = "test-ext-mock"
const TEST_EXT_DIR = path.join(DATA_ROOT, "extensions", TEST_EXT_NAME)
const TEST_ENABLED_FILE = path.join(DATA_ROOT, "extensions", "_enabled.json")

const writeManifest = async (dir: string, data: Record<string, unknown>): Promise<void> => {
  await fs.writeFileAtomic(path.join(dir, "manifest.json"), JSON.stringify(data))
}

const createTestExt = async (name: string, manifest?: Record<string, unknown>): Promise<string> => {
  const dir = path.join(DATA_ROOT, "extensions", name)
  await fs.mkdir(dir, { recursive: true })
  await writeManifest(dir, manifest ?? {
    name,
    displayName: `Display ${name}`,
    version: "1.0.0",
    description: "A test extension",
    author: "TestAuthor",
  })
  return dir
}

const cleanup = async (name: string): Promise<void> => {
  const dir = path.join(DATA_ROOT, "extensions", name)
  await fs.exists(dir).then(async (exists) => {
    if (exists) {
      await fsPromises.rm(dir, { recursive: true, force: true })
    }
  }).catch(() => {})
}

describe("ExtensionsService", () => {
  let service: ExtensionsService

  it("getExtensionsDirectory returns the extensions path", () => {
    service = new ExtensionsService()
    expect(service.getExtensionsDirectory()).toContain("extensions")
  })

  it("listExtensions returns discovered extensions", async () => {
    service = new ExtensionsService()
    await createTestExt("list-test-ext", {
      name: "list-test-ext",
      displayName: "List Test",
      version: "2.0.0",
      description: "For listing",
      author: "ListAuthor",
    })
    try {
      const extensions = await service.listExtensions()
      const found = extensions.find((e) => e.name === "list-test-ext")
      expect(found).toBeDefined()
      expect(found!.displayName).toBe("List Test")
      expect(found!.version).toBe("2.0.0")
      expect(found!.description).toBe("For listing")
      expect(found!.author).toBe("ListAuthor")
    } finally {
      await cleanup("list-test-ext")
    }
  })

  it("listExtensions returns enabled=false by default", async () => {
    service = new ExtensionsService()
    await createTestExt("enabled-default-test")
    try {
      const extensions = await service.listExtensions()
      const found = extensions.find((e) => e.name === "enabled-default-test")
      expect(found).toBeDefined()
      expect(found!.enabled).toBe(false)
    } finally {
      await cleanup("enabled-default-test")
    }
  })

  it("enableExtension marks extension as enabled", async () => {
    service = new ExtensionsService()
    await createTestExt("enable-test-ext")
    try {
      await service.enableExtension("enable-test-ext")
      const extensions = await service.listExtensions()
      const found = extensions.find((e) => e.name === "enable-test-ext")
      expect(found).toBeDefined()
      expect(found!.enabled).toBe(true)
    } finally {
      await cleanup("enable-test-ext")
    }
  })

  it("disableExtension marks extension as disabled", async () => {
    service = new ExtensionsService()
    await createTestExt("disable-test-ext")
    try {
      await service.enableExtension("disable-test-ext")
      await service.disableExtension("disable-test-ext")
      const extensions = await service.listExtensions()
      const found = extensions.find((e) => e.name === "disable-test-ext")
      expect(found).toBeDefined()
      expect(found!.enabled).toBe(false)
    } finally {
      await cleanup("disable-test-ext")
    }
  })

  it("enableExtension throws NotFoundError for missing extension", async () => {
    service = new ExtensionsService()
    await expect(service.enableExtension("nonexistent-ext-xyz")).rejects.toThrow()
  })

  it("disableExtension throws NotFoundError for missing extension", async () => {
    service = new ExtensionsService()
    await expect(service.disableExtension("nonexistent-ext-xyz")).rejects.toThrow()
  })

  it("installExtension throws ConflictError for existing extension", async () => {
    service = new ExtensionsService()
    await createTestExt("conflict-test-ext")
    try {
      await expect(
        service.installExtension("https://github.com/example/conflict-test-ext.git"),
      ).rejects.toThrow()
    } finally {
      await cleanup("conflict-test-ext")
    }
  })

  it("uninstallExtension removes extension directory", async () => {
    service = new ExtensionsService()
    await createTestExt("uninstall-test-ext")
    await service.uninstallExtension("uninstall-test-ext")
    const extExists = await fs.exists(path.join(DATA_ROOT, "extensions", "uninstall-test-ext"))
    expect(extExists).toBe(false)
  })

  it("uninstallExtension throws NotFoundError for missing extension", async () => {
    service = new ExtensionsService()
    await expect(service.uninstallExtension("nonexistent-ext-abc")).rejects.toThrow()
  })

  it("uninstallExtension removes from enabled list", async () => {
    service = new ExtensionsService()
    await createTestExt("uninstall-enabled-test")
    await service.enableExtension("uninstall-enabled-test")
    await service.uninstallExtension("uninstall-enabled-test")
    const extensions = await service.listExtensions()
    const found = extensions.find((e) => e.name === "uninstall-enabled-test")
    expect(found).toBeUndefined()
  })

  it("updateExtension throws NotFoundError for missing extension", async () => {
    service = new ExtensionsService()
    await expect(service.updateExtension("nonexistent-ext-update")).rejects.toThrow()
  })

  it("updateAllExtensions skips extensions without git URL", async () => {
    service = new ExtensionsService()
    await createTestExt("updateall-test-ext")
    try {
      const results = await service.updateAllExtensions()
      expect(Array.isArray(results)).toBe(true)
      const found = results.find((e) => e.name === "updateall-test-ext")
      expect(found).toBeDefined()
    } finally {
      await cleanup("updateall-test-ext")
    }
  })

  it("listExtensions skips hidden and underscore directories", async () => {
    service = new ExtensionsService()
    const hiddenDir = path.join(DATA_ROOT, "extensions", "_hidden-test-dir")
    await fs.mkdir(hiddenDir, { recursive: true })
    try {
      const extensions = await service.listExtensions()
      const hidden = extensions.find((e) => e.name === "_hidden-test-dir")
      expect(hidden).toBeUndefined()
    } finally {
      await fsPromises.rm(hiddenDir, { recursive: true, force: true })
    }
  })

  it("enableExtension is idempotent", async () => {
    service = new ExtensionsService()
    await createTestExt("idempotent-test-ext")
    try {
      await service.enableExtension("idempotent-test-ext")
      await service.enableExtension("idempotent-test-ext")
      const extensions = await service.listExtensions()
      const found = extensions.find((e) => e.name === "idempotent-test-ext")
      expect(found!.enabled).toBe(true)
    } finally {
      await cleanup("idempotent-test-ext")
    }
  })
})
