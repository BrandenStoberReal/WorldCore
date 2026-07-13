import { ValidationError } from "@/server/errors"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Asserts that `fileId` is a valid UUID.
 * Throws ValidationError if it fails — prevents path traversal via fileId.
 */
export function assertValidFileId(fileId: string): void {
  if (!UUID_RE.test(fileId)) {
    throw new ValidationError(`Invalid file id: "${fileId}"`)
  }
}
