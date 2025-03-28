import type { Source } from '../types.ts'

type FileSourceOptions = object

function file(path: string): Source {
  return () => [
    {
      id: `file-${path}`,
      tags: ['file'],
      value: path,
    },
  ]
}

export default file
export type { FileSourceOptions }
