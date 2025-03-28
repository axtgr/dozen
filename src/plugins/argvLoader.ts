import { parseArgs } from 'node:util'
import type { PluginFactory } from '../types.ts'

type ArgvLoaderOptions = object

const argvLoader: PluginFactory<ArgvLoaderOptions> = () => {
  return {
    name: 'argvLoader',
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
}

export default argvLoader
export type { ArgvLoaderOptions }
