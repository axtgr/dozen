import Path from 'node:path'
import { findUpFromCwd } from '../fileUtils.ts'
import type { Source } from '../types.ts'

interface IgnoreFilesSourceOptions {
  name?: string
  cwd?: string
  projectRoot?: string
  ignoreFiles?: {
    fileName?: string
    /**
     * Path to the directory until which to recursively look for ignore files from cwd.
     * When true, uses projectRoot; when false, looks only in cwd; when a string, uses that path.
     */
    lookUpUntil?: string | boolean
  }
}

/**
 * Provides ignore file paths as an entry.
 */
function ignoreFiles(
  sourceOptions?: IgnoreFilesSourceOptions['ignoreFiles'],
): Source<IgnoreFilesSourceOptions> {
  return (options) => {
    const fileName =
      sourceOptions?.fileName ||
      options.ignoreFiles?.fileName ||
      (options.name ? `.${options.name}ignore` : undefined)

    if (!fileName) return []

    const lookUpUntil = sourceOptions?.lookUpUntil || options.ignoreFiles?.lookUpUntil
    return findUpFromCwd(
      (path) => {
        return {
          id: `ignoreFiles:${path}`,
          format: ['file', 'ignore'],
          value: Path.join(path, fileName),
        }
      },
      options,
      lookUpUntil,
    )
  }
}

export default ignoreFiles
export type { IgnoreFilesSourceOptions }
