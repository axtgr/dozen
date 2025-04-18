import type { DozenInstance } from '../index.ts'
import type { Entry, PluginFactory } from '../types.ts'

function canLoadEntry(entry: Entry) {
  return (
    entry.format?.includes('fork') &&
    typeof (entry?.value as DozenInstance<[], []> | undefined)?.build === 'function'
  )
}

type ForkLoaderOptions = object

const forkLoader: PluginFactory<ForkLoaderOptions> = () => {
  return {
    name: 'default:forkLoader',
    load: async (entry) => {
      if (!canLoadEntry(entry)) return
      entry.value = await (entry.value as DozenInstance<[], []>).build()
      return entry
    },
  }
}

export default forkLoader
export type { ForkLoaderOptions }
