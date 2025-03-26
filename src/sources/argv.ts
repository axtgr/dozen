import type { Source } from '../types.ts'

interface ArgvSourceOptions {
  args?: string[]
}

function argv(options?: ArgvSourceOptions): Source {
  return () => [
    {
      id: 'argv',
      tags: ['argv'],
      value: options?.args,
    },
  ]
}

export default argv
