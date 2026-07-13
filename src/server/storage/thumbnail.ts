import { Jimp } from "jimp"
import path from "node:path"
import fs from "node:fs/promises"

export async function generateThumbnail(
  sourcePath: string,
  outputDir: string,
  width: number = 200,
): Promise<string> {
  const image = await Jimp.read(sourcePath)
  const height = Math.round(width * (image.height / image.width))
  image.resize({ w: width, h: height })
  const baseName = path.basename(sourcePath, path.extname(sourcePath))
  const thumbName = `thumb_${baseName}.png`
  const outputPath = path.join(outputDir, thumbName)
  const buffer = await image.getBuffer("image/png")
  await fs.writeFile(outputPath, buffer)
  return thumbName
}
