import fs from "node:fs/promises"
import path from "node:path"

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const CRC32_TABLE: number[] = (() => {
  const table: number[] = new Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c
  }
  return table
})()

function computeCrc32(data: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    const byte = data[i] ?? 0
    const tableEntry = CRC32_TABLE[(crc ^ byte) & 0xff] ?? 0
    crc = tableEntry ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function encodeChunk(keyword: string, data: string): Buffer {
  const keywordBuf = Buffer.from(keyword, "ascii")
  const dataBuf = Buffer.from(data, "latin1")
  const chunkType = Buffer.from("tEXt", "ascii")
  // tEXt chunk data: keyword\0text
  const chunkDataLen = keywordBuf.length + 1 + dataBuf.length
  const chunkData = Buffer.alloc(chunkDataLen)
  keywordBuf.copy(chunkData, 0)
  chunkData[keywordBuf.length] = 0
  dataBuf.copy(chunkData, keywordBuf.length + 1)
  // CRC is over type + data
  const crcInput = Buffer.alloc(4 + chunkDataLen)
  chunkType.copy(crcInput, 0)
  chunkData.copy(crcInput, 4)
  const crc = computeCrc32(crcInput)
  // Full chunk: length(4) + type(4) + data + crc(4)
  const chunk = Buffer.alloc(4 + 4 + chunkDataLen + 4)
  chunk.writeUInt32BE(chunkDataLen, 0)
  chunkType.copy(chunk, 4)
  chunkData.copy(chunk, 8)
  chunk.writeUInt32BE(crc, 8 + chunkDataLen)
  return chunk
}

function parseChunks(pngData: Buffer): { offset: number; length: number; type: string; data: Buffer; crc: number }[] {
  const chunks: { offset: number; length: number; type: string; data: Buffer; crc: number }[] = []
  let offset = 8
  while (offset < pngData.length) {
    const length = pngData.readUInt32BE(offset)
    const type = pngData.toString("ascii", offset + 4, offset + 8)
    const data = pngData.subarray(offset + 8, offset + 8 + length)
    const crc = pngData.readUInt32BE(offset + 8 + length)
    chunks.push({ offset, length, type, data, crc })
    offset += 12 + length
  }
  return chunks
}

export function readPngTextChunks(buffer: Buffer): Map<string, string> {
  const result = new Map<string, string>()
  const chunks = parseChunks(buffer)
  for (const chunk of chunks) {
    if (chunk.type === "tEXt") {
      const nullIndex = chunk.data.indexOf(0)
      if (nullIndex === -1) continue
      const keyword = chunk.data.toString("latin1", 0, nullIndex)
      const text = chunk.data.toString("latin1", nullIndex + 1)
      result.set(keyword, text)
    }
  }
  return result
}

export async function readCharacterCard(filePath: string): Promise<string | undefined> {
  const buffer = await fs.readFile(filePath)
  const textChunks = readPngTextChunks(buffer)
  const ccv3 = textChunks.get("ccv3")
  if (ccv3) {
    return Buffer.from(ccv3, "base64").toString("utf-8")
  }
  const chara = textChunks.get("chara")
  if (chara) {
    return Buffer.from(chara, "base64").toString("utf-8")
  }
  return undefined
}

export async function readCharacterCardJson(filePath: string): Promise<Record<string, unknown> | undefined> {
  const raw = await readCharacterCard(filePath)
  if (!raw) return undefined
  return JSON.parse(raw) as Record<string, unknown>
}

export function removePngTextChunk(buffer: Buffer, keyword: string): Buffer {
  const chunks = parseChunks(buffer)
  const filtered = chunks.filter((c) => !(c.type === "tEXt" && c.data.indexOf(Buffer.from(keyword, "latin1")) === 0 && (c.data[keyword.length] ?? 0) === 0))
  const totalSize = 8 + filtered.reduce((sum, c) => sum + 12 + c.length, 0)
  const result = Buffer.alloc(totalSize)
  PNG_SIGNATURE.copy(result, 0)
  let offset = 8
  for (const chunk of filtered) {
    const chunkBytes = buffer.subarray(chunk.offset, chunk.offset + 12 + chunk.length)
    chunkBytes.copy(result, offset)
    offset += chunkBytes.length
  }
  return result
}

export async function writeCharacterCard(
  inputPath: string | Buffer,
  jsonData: string,
  outputPath: string,
): Promise<void> {
  const pngBuffer = typeof inputPath === "string" ? await fs.readFile(inputPath) : inputPath
  const base64Data = Buffer.from(jsonData).toString("base64")
  let buffer = removePngTextChunk(pngBuffer, "chara")
  buffer = removePngTextChunk(buffer, "ccv3")
  const charaChunk = encodeChunk("chara", base64Data)
  const ccv3Chunk = encodeChunk("ccv3", base64Data)
  const iendOffset = buffer.length - 12
  const result = Buffer.alloc(buffer.length - 12 + charaChunk.length + ccv3Chunk.length + 12)
  buffer.subarray(0, iendOffset).copy(result, 0)
  charaChunk.copy(result, iendOffset)
  ccv3Chunk.copy(result, iendOffset + charaChunk.length)
  buffer.subarray(iendOffset).copy(result, iendOffset + charaChunk.length + ccv3Chunk.length)
  const outDir = path.dirname(outputPath)
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(outputPath, result)
}
