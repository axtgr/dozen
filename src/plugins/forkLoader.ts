import type { DozenInstance } from '../index.ts'
import type { Entry, PluginFactory } from '../types.ts'

function canLoadEntry(entry: Entry) {
  return (
    entry.tags?.includes('fork') &&
    typeof (entry?.value as DozenInstance | undefined)?.load === 'function'
  )
}

type ForkLoaderOptions = object

const forkLoader: PluginFactory<ForkLoaderOptions> = () => {
  return {
    name: 'forkLoader',
    load: async (entry) => {
      if (!canLoadEntry(entry)) return
      entry.status = 'loaded'
      entry.value = await (entry.value as DozenInstance).load()
      return entry
    },
  }
}

export default forkLoader
export type { ForkLoaderOptions }
