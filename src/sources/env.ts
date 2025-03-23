import type { SourceFactory } from '../types.ts'

function env(): SourceFactory {
  return () => ({
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
  })
}

export default env
