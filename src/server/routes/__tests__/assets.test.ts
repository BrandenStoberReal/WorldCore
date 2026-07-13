import { describe, it, expect } from "bun:test"
import { avatarsRoutes } from "@/server/routes/avatars.routes"
import { backgroundsRoutes } from "@/server/routes/backgrounds.routes"
import { spritesRoutes } from "@/server/routes/sprites.routes"
import { assetsRoutes } from "@/server/routes/assets.routes"
import { filesRoutes } from "@/server/routes/files.routes"

const createImageFile = (name: string): File => {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type: "image/png" })
}

const createGenericFile = (name: string): File => {
  return new File(["test content"], name, { type: "application/octet-stream" })
}

describe("Avatars routes (T24)", () => {
  it("upload returns ok with fileName", async () => {
    const formData = new FormData()
    formData.append("file", createImageFile("test-avatar.png"))

    const res = await avatarsRoutes.upload(
      new Request("http://localhost/api/v1/avatars/upload", {
        method: "POST",
        body: formData,
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as { ok: boolean; fileName: string }
    expect(data.ok).toBe(true)
    expect(data.fileName).toBeDefined()
    expect(data.fileName.endsWith(".png")).toBe(true)
  })

  it("list returns array", async () => {
    const res = await avatarsRoutes.list(
      new Request("http://localhost/api/v1/avatars/list", {
        method: "POST",
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Array<Record<string, unknown>>
    expect(Array.isArray(data)).toBe(true)
  })

  it("upload rejected for non-image type", async () => {
    const formData = new FormData()
    formData.append("file", createGenericFile("test.txt"))

    const res = await avatarsRoutes.upload(
      new Request("http://localhost/api/v1/avatars/upload", {
        method: "POST",
        body: formData,
      }),
    )
    expect(res.status).toBe(500)
  })
})

describe("Backgrounds routes (T24)", () => {
  it("upload returns ok with fileName", async () => {
    const formData = new FormData()
    formData.append("file", createImageFile("test-bg.png"))

    const res = await backgroundsRoutes.upload(
      new Request("http://localhost/api/v1/backgrounds/upload", {
        method: "POST",
        body: formData,
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as { ok: boolean; fileName: string }
    expect(data.ok).toBe(true)
    expect(data.fileName).toBeDefined()
  })

  it("list returns array", async () => {
    const res = await backgroundsRoutes.list(
      new Request("http://localhost/api/v1/backgrounds/list", {
        method: "POST",
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Array<Record<string, unknown>>
    expect(Array.isArray(data)).toBe(true)
  })
})

describe("Sprites routes (T24)", () => {
  it("upload returns ok with fileName", async () => {
    const formData = new FormData()
    formData.append("file", createImageFile("test-sprite.png"))

    const res = await spritesRoutes.upload(
      new Request("http://localhost/api/v1/sprites/upload", {
        method: "POST",
        body: formData,
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as { ok: boolean; fileName: string }
    expect(data.ok).toBe(true)
    expect(data.fileName).toBeDefined()
  })

  it("list returns array", async () => {
    const res = await spritesRoutes.list(
      new Request("http://localhost/api/v1/sprites/list", {
        method: "POST",
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Array<Record<string, unknown>>
    expect(Array.isArray(data)).toBe(true)
  })
})

describe("Assets routes (T24)", () => {
  it("upload returns ok with fileName", async () => {
    const formData = new FormData()
    formData.append("file", createGenericFile("test-asset.bin"))

    const res = await assetsRoutes.upload(
      new Request("http://localhost/api/v1/assets/upload", {
        method: "POST",
        body: formData,
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as { ok: boolean; fileName: string }
    expect(data.ok).toBe(true)
    expect(data.fileName).toBeDefined()
  })

  it("list returns array", async () => {
    const res = await assetsRoutes.list(
      new Request("http://localhost/api/v1/assets/list", {
        method: "POST",
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Array<Record<string, unknown>>
    expect(Array.isArray(data)).toBe(true)
  })
})

describe("Files routes (T24)", () => {
  it("upload returns ok with fileName", async () => {
    const formData = new FormData()
    formData.append("file", createGenericFile("test-file.txt"))

    const res = await filesRoutes.upload(
      new Request("http://localhost/api/v1/files/upload", {
        method: "POST",
        body: formData,
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as { ok: boolean; fileName: string }
    expect(data.ok).toBe(true)
    expect(data.fileName).toBeDefined()
  })

  it("list returns array", async () => {
    const res = await filesRoutes.list(
      new Request("http://localhost/api/v1/files/list", {
        method: "POST",
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Array<Record<string, unknown>>
    expect(Array.isArray(data)).toBe(true)
  })
})
