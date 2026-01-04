import fs from 'node:fs'
import Path from 'node:path'

/**
 * Iterates over the directories from cwd up to `stopAt` or `projectRoot`, calling `cb` with
 * the current directory path and returning an array of the `cb` results.
 */
function findUpFromCwd<T>(
  cb: (path: string) => T,
  options: { cwd?: string; projectRoot?: string } = {},
  stopAt?: string | boolean,
): T[] {
  const cwd = options.cwd || process.cwd()
  const stopAtPath =
    stopAt === false
      ? cwd
      : typeof stopAt === 'string'
        ? Path.resolve(stopAt)
        : options.projectRoot || cwd
  const stopAtRelative = Path.relative(cwd, stopAtPath)
  const pathSegments = ['.'].concat(stopAtRelative.split(Path.sep).filter(Boolean))

  const result: T[] = []
  let currentPath: string | undefined

  for (const segment of pathSegments) {
    currentPath = currentPath ? Path.join(currentPath, segment) : segment
    const item = cb(currentPath)
    result.unshift(item)
  }

  return result
}

function findFileUpSync(
  name: string,
  cwd = process.cwd(),
  type: 'any' | 'file' | 'directory' = 'any',
  stopAt?: string,
) {
  let directory = Path.resolve(cwd)
  const { root } = Path.parse(directory)
  const isAbsoluteName = Path.isAbsolute(name)
  stopAt = Path.resolve(directory, stopAt ?? root)

  while (directory) {
    const filePath = isAbsoluteName ? name : Path.join(directory, name)

    try {
      const stats = fs.statSync(filePath, { throwIfNoEntry: false })
      if (
        (type === 'any' && stats) ||
        (type === 'file' && stats?.isFile()) ||
        (type === 'directory' && stats?.isDirectory())
      ) {
        return filePath
      }
    } catch {}

    if (directory === stopAt || directory === root) {
      break
    }

    directory = Path.dirname(directory)
  }
}

export { findUpFromCwd, findFileUpSync }
