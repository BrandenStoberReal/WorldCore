import path from "node:path"

/**
 * Validates that a user-supplied path stays within the base directory.
 * Returns the resolved absolute path if safe, or null if it escapes.
 */
export function safePathWithin(baseDir: string, userInput: string): string | null {
  const resolvedBase = path.resolve(baseDir)
  const resolvedPath = path.resolve(baseDir, userInput)
  if (resolvedPath === resolvedBase || resolvedPath.startsWith(resolvedBase + path.sep)) {
    return resolvedPath
  }
  return null
}
