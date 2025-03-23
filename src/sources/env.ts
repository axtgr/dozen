import type { Source } from '../types.ts'

function env(): Source {
  return {
    name: 'env',
    readSync() {
      return [
        {
          source: this,
          id: 'process.env',
          tags: ['env'],
          value: process.env,
        },
      ]
    },
  }
}

export default env
