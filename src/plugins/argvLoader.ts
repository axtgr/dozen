import { parseArgs } from 'node:util'
import type { Entry, PluginFactory } from '../types.ts'

function canLoadEntry(entry: Entry) {
  return entry.tags?.includes('argv') && (!entry.value || Array.isArray(entry.value))
}

type ArgvLoaderOptions = object

const argvLoader: PluginFactory<ArgvLoaderOptions> = () => {
  return {
    name: 'argvLoader',
    loadSync: (entry) => {
      if (!canLoadEntry(entry)) return entry
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
