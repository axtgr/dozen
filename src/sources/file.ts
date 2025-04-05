import type { Source } from '../types.ts'

type FileSourceOptions = object

/**
 * Provides a file path as an entry.
 */
function file(path: string): Source {
  return () => [
    {
      id: `file-${path}`,
      format: ['file'],
      value: path,
    },
  ]
}

export default file
export type { FileSourceOptions }
