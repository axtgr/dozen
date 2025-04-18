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
  let currentPath: string | undefined = undefined

  for (const segment of pathSegments) {
    currentPath = currentPath ? Path.join(currentPath, segment) : segment
    const item = cb(currentPath)
    result.unshift(item)
  }

  return result
}

export { findUpFromCwd }
