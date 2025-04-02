import { parseArgs } from 'node:util'
import type { Entry, PluginFactory } from '../types.ts'

function canLoadEntry(entry: Entry) {
  return entry.format?.includes('argv') && (!entry.value || Array.isArray(entry.value))
}

type ArgvLoaderOptions = object

const argvLoader: PluginFactory<ArgvLoaderOptions> = () => {
  return {
    name: 'default:argvLoader',
    load: async (entry) => {
      if (!canLoadEntry(entry)) return
      const { values } = parseArgs({
        args: entry.value as string[],
        strict: false,
        allowNegative: true,
      })
      entry.value = values
      return entry
    },
  }
}

export default argvLoader
export type { ArgvLoaderOptions }
