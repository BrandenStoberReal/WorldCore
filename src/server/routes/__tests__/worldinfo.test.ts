import { describe, it, expect } from "bun:test"
import { worldinfoRoutes } from "@/server/routes/worldinfo.routes"
import type { WorldInfoEntry } from "@/shared/types/worldinfo"

const makeEntry = (uid: string, key: string): WorldInfoEntry => ({
  uid,
  key,
  keysecondary: ["alt"],
  comment: "",
  content: `Content for ${key}`,
  constant: false,
  vectorized: false,
  selective: false,
  selectiveLogic: 0,
  addMemo: false,
  order: 0,
  position: 0,
  disable: false,
  excludeRecursion: false,
  preventRecursion: false,
  delayUntilRecursion: false,
  probability: 1,
  useProbability: false,
  depth: 0,
  group: 0,
  groupOverride: false,
  groupWeight: 1,
  scanDepth: 0,
  caseSensitive: false,
  matchWholeWords: false,
  automationId: "",
  role: "",
  sticky: false,
  cooldown: 0,
  delay: 0,
  matchPersonaDescription: false,
  matchCharacterDescription: false,
  matchCharacterPersonality: false,
  matchCharacterDepthPrompt: false,
  matchScenario: false,
  matchCreatorNotes: false,
  triggers: "",
  ignoreBudget: false,
})

describe("WorldInfo routes", () => {
  let fileId: number

  it("create returns ok and id", async () => {
    const res = await worldinfoRoutes.create(
      new Request("http://localhost/api/v1/worldinfo/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Route Test WI",
          entries: [makeEntry("r1", "route_key1"), makeEntry("r2", "route_key2")],
        }),
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Record<string, unknown>
    expect(data.ok).toBe(true)
    expect(typeof data.id).toBe("number")
    fileId = data.id as number
  })

  it("get returns the world info", async () => {
    const res = await worldinfoRoutes.get(
      new Request("http://localhost/api/v1/worldinfo/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Record<string, unknown> | null
    expect(data).not.toBeNull()
    expect(data!.name).toBe("Route Test WI")
  })

  it("get returns null for non-existent file", async () => {
    const res = await worldinfoRoutes.get(
      new Request("http://localhost/api/v1/worldinfo/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: 999999 }),
      }),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toBeNull()
  })

  it("add-entry adds an entry", async () => {
    const res = await worldinfoRoutes.addEntry(
      new Request("http://localhost/api/v1/worldinfo/add-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, entry: makeEntry("r3", "route_key3") }),
      }),
    )
    expect(res.status).toBe(200)

    const getRes = await worldinfoRoutes.get(
      new Request("http://localhost/api/v1/worldinfo/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      }),
    )
    const wi = (await getRes.json()) as Record<string, unknown>
    expect((wi.entries as Record<string, WorldInfoEntry>)["r3"]?.key).toBe("route_key3")
  })

  it("update-entry modifies an entry", async () => {
    const updatedEntry = makeEntry("r1", "updated_route_key1")
    updatedEntry.content = "Updated route content"
    const res = await worldinfoRoutes.updateEntry(
      new Request("http://localhost/api/v1/worldinfo/update-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, uid: "r1", entry: updatedEntry }),
      }),
    )
    expect(res.status).toBe(200)

    const getRes = await worldinfoRoutes.get(
      new Request("http://localhost/api/v1/worldinfo/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      }),
    )
    const wi = (await getRes.json()) as Record<string, unknown>
    expect((wi.entries as Record<string, WorldInfoEntry>)["r1"]?.key).toBe("updated_route_key1")
  })

  it("delete-entry removes an entry", async () => {
    const res = await worldinfoRoutes.deleteEntry(
      new Request("http://localhost/api/v1/worldinfo/delete-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, uid: "r3" }),
      }),
    )
    expect(res.status).toBe(200)

    const getRes = await worldinfoRoutes.get(
      new Request("http://localhost/api/v1/worldinfo/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      }),
    )
    const wi = (await getRes.json()) as Record<string, unknown>
    expect((wi.entries as Record<string, WorldInfoEntry>)["r3"]).toBeUndefined()
  })

  it("all returns list containing the world info", async () => {
    const res = await worldinfoRoutes.all(
      new Request("http://localhost/api/v1/worldinfo/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Array<Record<string, unknown>>
    const found = data.find((w) => w.id === fileId)
    expect(found).toBeDefined()
    expect(found!.entryCount).toBeGreaterThanOrEqual(2)
  })

  it("update modifies the world info name", async () => {
    const res = await worldinfoRoutes.update(
      new Request("http://localhost/api/v1/worldinfo/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, data: { name: "Updated Route WI" } }),
      }),
    )
    expect(res.status).toBe(200)

    const getRes = await worldinfoRoutes.get(
      new Request("http://localhost/api/v1/worldinfo/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      }),
    )
    const wi = (await getRes.json()) as Record<string, unknown>
    expect(wi.name).toBe("Updated Route WI")
  })

  it("delete removes the world info", async () => {
    const res = await worldinfoRoutes.delete(
      new Request("http://localhost/api/v1/worldinfo/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      }),
    )
    expect(res.status).toBe(200)

    const getRes = await worldinfoRoutes.get(
      new Request("http://localhost/api/v1/worldinfo/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
      }),
    )
    const data = await getRes.json()
    expect(data).toBeNull()
  })
})
