import { writeFileAtomic } from "./fs"
import sanitize from "sanitize-filename"
import path from "node:path"
import { randomUUID } from "node:crypto"

export async function handleFileUpload(
  formData: FormData,
  fieldname: string,
  destDir: string,
  allowedTypes?: string[],
): Promise<{ fileName: string; path: string; mimeType: string }> {
  const file = formData.get(fieldname)
  if (!(file instanceof File)) {
    throw new Error(`Missing or invalid field: ${fieldname}`)
  }

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`)
  }

  const ext = path.extname(file.name) || ".bin"
  const safeName = sanitize(path.basename(file.name, ext))
  const fileName = `${safeName}_${randomUUID()}${ext}`
  const filePath = path.join(destDir, fileName)

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFileAtomic(filePath, buffer)

  return { fileName, path: filePath, mimeType: file.type }
}
