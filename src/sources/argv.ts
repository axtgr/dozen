import type { Source } from '../types.ts'

interface ArgvSourceOptions {
  args?: string[]
}

/**
 * Provides command line arguments as an entry.
 */
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
