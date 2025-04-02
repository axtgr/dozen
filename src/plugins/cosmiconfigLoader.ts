import { cosmiconfig, cosmiconfigSync } from 'cosmiconfig'
import type { Entry, PluginFactory } from '../types.ts'

function canLoadEntry(entry: Entry) {
  return (
    typeof entry.value === 'string' &&
    (entry.format?.includes('configFile') || entry.format?.includes('file'))
  )
}

interface CosmiconfigLoaderOptions {
  name?: string
}

const cosmiconfigLoader: PluginFactory<CosmiconfigLoaderOptions> = () => {
  return {
    name: 'default:cosmiconfigLoader',
    load: async (entry) => {
      if (!canLoadEntry(entry)) return
      const isConfigFile = entry.format?.includes('configFile')
      const explorer = cosmiconfig(isConfigFile ? (entry.value as string) : '')
      const result = await (isConfigFile
        ? explorer.search()
        : explorer.load(entry.value as string)
      ).catch(() => {})
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
