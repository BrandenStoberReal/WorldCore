import { Jimp } from "jimp"
import path from "node:path"
import fs from "node:fs/promises"
import { ValidationError } from "@/server/errors"

export async function generateThumbnail(
  sourcePath: string,
  outputDir: string,
  width: number = 200,
): Promise<string> {
  const image = await Jimp.read(sourcePath)
  if (image.width === 0 || image.height === 0) {
    throw new ValidationError("Invalid image dimensions")
  }
  const height = Math.round(width * (image.height / image.width))
  image.resize({ w: width, h: height })
  const baseName = path.basename(sourcePath, path.extname(sourcePath))
  const thumbName = `thumb_${baseName}.png`
  const outputPath = path.join(outputDir, thumbName)
  const buffer = await image.getBuffer("image/png")
  await fs.writeFile(outputPath, buffer)
  return thumbName
}
