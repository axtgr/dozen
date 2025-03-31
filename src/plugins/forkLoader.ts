import type Dozen from '../index.ts'
import type { Entry, PluginFactory } from '../types.ts'

function canLoadEntry(entry: Entry) {
  return (
    entry.tags?.includes('fork') &&
    typeof (entry?.value as ReturnType<typeof Dozen> | undefined)?.get === 'function'
  )
}

type ForkLoaderOptions = object

const forkLoader: PluginFactory<ForkLoaderOptions> = () => {
  return {
    name: 'forkLoader',
    loadSync: (entry) => {
      if (!canLoadEntry(entry)) return entry
      return {
        id: entry.id,
        loaded: true,
        value: (entry.value as ReturnType<typeof Dozen>).get(),
      }
    },
    loadAsync: async (entry) => {
      if (!canLoadEntry(entry)) return entry
      return {
        id: entry.id,
        loaded: true,
        value: (entry.value as ReturnType<typeof Dozen>).getAsync(),
      }
    },
  }
}

export default forkLoader
export type { ForkLoaderOptions }
