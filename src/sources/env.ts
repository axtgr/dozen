import type { Source } from '../types.ts'

type EnvSourceOptions = object

/**
 * Provides environment variables as an entry.
 */
function env(): Source {
  return () => [
    {
      id: 'process.env',
      format: ['env', 'object'],
      value: process.env,
    },
  ]
}

export default env
export type { EnvSourceOptions }
