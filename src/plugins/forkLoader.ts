import type Dozen from '../index.ts'
import type { PluginFactory } from '../types.ts'

type ForkLoaderOptions = object

const forkLoader: PluginFactory<ForkLoaderOptions> = () => {
  return {
    name: 'forkLoader',
    canLoadSync: (entry) => {
      return Boolean(entry.tags?.includes('fork'))
    },
    loadSync: (entry) => {
      if (typeof (entry?.value as ReturnType<typeof Dozen>)?.get !== 'function') return entry
      return {
        id: entry.id,
        loaded: true,
        value: (entry.value as ReturnType<typeof Dozen>).get(),
      }
    },
    loadAsync: async (entry) => {
      if (typeof (entry?.value as ReturnType<typeof Dozen>)?.get !== 'function') return entry
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
