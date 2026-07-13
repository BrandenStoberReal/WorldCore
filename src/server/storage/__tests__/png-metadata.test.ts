import { describe, it, expect } from "bun:test"
import {
  readPngTextChunks,
  readCharacterCard,
  writeCharacterCard,
  removePngTextChunk,
} from "../png-metadata"
import { Jimp } from "jimp"
import fs from "node:fs/promises"
import path from "node:path"

const testDir = path.join("./data", "_test_png")

async function createTestPng(): Promise<Buffer> {
  const img = new Jimp({ width: 1, height: 1, color: 0xFF0000FF })
  return await img.getBuffer("image/png")
}

describe("png-metadata", () => {
  it("read tEXt chunks from PNG with metadata", async () => {
    const pngBuffer = await createTestPng()
    const testJson = JSON.stringify({ name: "TestChar", description: "A test character" })
    const outputPath = path.join(testDir, "test_char.png")
    await fs.mkdir(testDir, { recursive: true })
    await writeCharacterCard(pngBuffer, testJson, outputPath)

    const resultBuffer = await fs.readFile(outputPath)
    const chunks = readPngTextChunks(resultBuffer)
    expect(chunks.has("chara")).toBe(true)
    expect(chunks.has("ccv3")).toBe(true)

    const charaB64 = chunks.get("chara")!
    const parsed = JSON.parse(Buffer.from(charaB64, "base64").toString("utf-8"))
    expect(parsed).toEqual({ name: "TestChar", description: "A test character" })
  })

  it("round-trip: write chara/ccv3, read them back", async () => {
    const pngBuffer = await createTestPng()
    const cardData = {
      spec: "chara_card_v3",
      spec_version: "3.0",
      data: {
        name: "RoundTrip",
        description: "Testing round-trip",
        personality: "Friendly",
        scenario: "Test scenario",
        first_mes: "Hello!",
      },
    }
    const jsonStr = JSON.stringify(cardData)
    const outputPath = path.join(testDir, "roundtrip.png")
    await fs.mkdir(testDir, { recursive: true })
    await writeCharacterCard(pngBuffer, jsonStr, outputPath)

    const readJson = await readCharacterCard(outputPath)
    expect(readJson).toBeDefined()
    const parsed = JSON.parse(readJson!)
    expect(parsed.spec).toBe("chara_card_v3")
    expect(parsed.data.name).toBe("RoundTrip")
    expect(parsed.data.first_mes).toBe("Hello!")
  })

  it("removePngTextChunk removes specified chunk", async () => {
    const pngBuffer = await createTestPng()
    const jsonStr = JSON.stringify({ test: "data" })
    const outputPath = path.join(testDir, "remove_test.png")
    await fs.mkdir(testDir, { recursive: true })
    await writeCharacterCard(pngBuffer, jsonStr, outputPath)

    const writtenBuffer = await fs.readFile(outputPath)
    const beforeChunks = readPngTextChunks(writtenBuffer)
    expect(beforeChunks.has("chara")).toBe(true)
    expect(beforeChunks.has("ccv3")).toBe(true)

    const removed = removePngTextChunk(writtenBuffer, "chara")
    const afterChunks = readPngTextChunks(removed)
    expect(afterChunks.has("chara")).toBe(false)
    expect(afterChunks.has("ccv3")).toBe(true)

    const removedBoth = removePngTextChunk(removed, "ccv3")
    const finalChunks = readPngTextChunks(removedBoth)
    expect(finalChunks.has("chara")).toBe(false)
    expect(finalChunks.has("ccv3")).toBe(false)
  })

  it("writeCharacterCard overwrites existing metadata", async () => {
    const pngBuffer = await createTestPng()
    const firstJson = JSON.stringify({ version: 1, name: "Original" })
    const outputPath = path.join(testDir, "overwrite.png")
    await fs.mkdir(testDir, { recursive: true })
    await writeCharacterCard(pngBuffer, firstJson, outputPath)

    const secondJson = JSON.stringify({ version: 2, name: "Updated" })
    await writeCharacterCard(outputPath, secondJson, outputPath)

    const readJson = await readCharacterCard(outputPath)
    expect(readJson).toBeDefined()
    const parsed = JSON.parse(readJson!)
    expect(parsed.version).toBe(2)
    expect(parsed.name).toBe("Updated")
  })
})
