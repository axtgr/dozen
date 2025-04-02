import type { Source } from '../types.ts'

interface ArgvSourceOptions {
  args?: string[]
}

function argv(options?: ArgvSourceOptions): Source {
  return () => [
    {
      id: 'argv',
      format: ['argv'],
      value: options?.args,
    },
  ]
}

export default argv
export type { ArgvSourceOptions }
