import { describe, it, expect } from "bun:test"
import { groupsRoutes } from "@/server/routes/groups.routes"

describe("Groups routes", () => {
  let groupId: string

  it("create returns ok and id", async () => {
    const res = await groupsRoutes.create(
      new Request("http://localhost/api/v1/groups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Route Test Group",
          members: ["route_char1.png", "route_char2.png"],
        }),
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Record<string, unknown>
    expect(data.ok).toBe(true)
    expect(typeof data.id).toBe("string")
    groupId = data.id as string
  })

  it("get returns the group", async () => {
    const res = await groupsRoutes.get(
      new Request("http://localhost/api/v1/groups/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: groupId }),
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Record<string, unknown> | null
    expect(data).not.toBeNull()
    expect(data!.name).toBe("Route Test Group")
  })

  it("get returns null for non-existent group", async () => {
    const res = await groupsRoutes.get(
      new Request("http://localhost/api/v1/groups/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "non-existent" }),
      }),
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toBeNull()
  })

  it("add-member adds a member", async () => {
    const res = await groupsRoutes.addMember(
      new Request("http://localhost/api/v1/groups/add-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: groupId, characterFileName: "route_char3.png" }),
      }),
    )
    expect(res.status).toBe(200)

    const getRes = await groupsRoutes.get(
      new Request("http://localhost/api/v1/groups/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: groupId }),
      }),
    )
    const group = (await getRes.json()) as Record<string, unknown>
    expect((group.members as string[]).includes("route_char3.png")).toBe(true)
  })

  it("remove-member removes a member", async () => {
    const res = await groupsRoutes.removeMember(
      new Request("http://localhost/api/v1/groups/remove-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: groupId, characterFileName: "route_char3.png" }),
      }),
    )
    expect(res.status).toBe(200)

    const getRes = await groupsRoutes.get(
      new Request("http://localhost/api/v1/groups/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: groupId }),
      }),
    )
    const group = (await getRes.json()) as Record<string, unknown>
    expect((group.members as string[]).includes("route_char3.png")).toBe(false)
  })

  it("all returns list containing the group", async () => {
    const res = await groupsRoutes.all(
      new Request("http://localhost/api/v1/groups/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    )
    expect(res.status).toBe(200)
    const data = (await res.json()) as Record<string, unknown>[]
    const found = data.find((g) => g.id === groupId)
    expect(found).toBeDefined()
  })

  it("update modifies the group", async () => {
    const res = await groupsRoutes.update(
      new Request("http://localhost/api/v1/groups/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: groupId, data: { name: "Updated Route Group", fav: true } }),
      }),
    )
    expect(res.status).toBe(200)

    const getRes = await groupsRoutes.get(
      new Request("http://localhost/api/v1/groups/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: groupId }),
      }),
    )
    const group = (await getRes.json()) as Record<string, unknown>
    expect(group.name).toBe("Updated Route Group")
    expect(group.fav).toBe(true)
  })

  it("delete removes the group", async () => {
    const res = await groupsRoutes.delete(
      new Request("http://localhost/api/v1/groups/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: groupId }),
      }),
    )
    expect(res.status).toBe(200)

    const getRes = await groupsRoutes.get(
      new Request("http://localhost/api/v1/groups/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: groupId }),
      }),
    )
    const data = await getRes.json()
    expect(data).toBeNull()
  })
})
