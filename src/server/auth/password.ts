import { scrypt as _scrypt, randomBytes, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scrypt = promisify(_scrypt)

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(plain, salt, 64)
  const hash = key as Buffer
  return `${salt.toString("base64")}:${hash.toString("base64")}`
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(":")
  if (!saltB64 || !hashB64) return false
  const salt = Buffer.from(saltB64, "base64")
  const expectedHash = Buffer.from(hashB64, "base64")
  const key = await scrypt(plain, salt, 64)
  const computedHash = key as Buffer
  if (computedHash.length !== expectedHash.length) return false
  return timingSafeEqual(computedHash, expectedHash)
}
