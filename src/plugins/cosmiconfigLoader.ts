import { cosmiconfig, cosmiconfigSync } from 'cosmiconfig'
import type { Entry, PluginFactory } from '../types.ts'

function canLoadEntry(entry: Entry) {
  return (
    typeof entry.value === 'string' &&
    (entry.tags?.includes('configFile') || entry.tags?.includes('file'))
  )
}

interface CosmiconfigLoaderOptions {
  name?: string
}

const cosmiconfigLoader: PluginFactory<CosmiconfigLoaderOptions> = () => {
  return {
    name: 'cosmiconfigLoader',
    load: async (entry) => {
      if (!canLoadEntry(entry)) return
      const isConfigFile = entry.tags?.includes('configFile')
      const explorer = cosmiconfig(isConfigFile ? (entry.value as string) : '')
      const result = await (isConfigFile ? explorer.search() : explorer.load(entry.value as string))
      entry.status = 'loaded'
      entry.value = result?.config || {}
      if (result) {
        entry.meta ??= {}
        entry.meta.filePath = result.filepath
      }
      return entry
    },
  }
}

export default cosmiconfigLoader
export type { CosmiconfigLoaderOptions }
