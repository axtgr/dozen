import { parseArgs } from 'node:util'
import type { Loader } from '../types.ts'

const argvLoader: Loader = {
  name: 'argv',
  canLoadSync: (entry) => {
    return Boolean(entry.tags?.includes('argv') && (!entry.value || Array.isArray(entry.value)))
  },
  loadSync: (entry) => {
    const { values } = parseArgs({
      args: entry.value as string[],
      strict: false,
      allowNegative: true,
    })
    return [
      {
        ...entry,
        loaded: true,
        value: values,
      },
    ]
  },
}

export default argvLoader
