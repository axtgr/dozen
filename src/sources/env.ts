import type { Source } from '../types.ts'

type EnvSourceOptions = object

function env(): Source {
  return () => [
    {
      id: 'process.env',
      format: ['env', 'object'],
      status: 'loaded',
      value: process.env,
    },
  ]
}

export default env
export type { EnvSourceOptions }
