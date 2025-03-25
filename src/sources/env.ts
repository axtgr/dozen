import type { Source } from '../types.ts'

function env(): Source {
  return () => [
    {
      id: 'process.env',
      tags: ['env'],
      loaded: true,
      value: process.env,
    },
  ]
}

export default env
