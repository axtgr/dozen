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
    loadSync: (entry) => {
      if (!canLoadEntry(entry)) return entry
      const isConfigFile = entry.tags?.includes('configFile')
      const explorer = cosmiconfigSync(isConfigFile ? (entry.value as string) : '', {
        loaders: {
          // .mjs files can only be loaded via an async import, and cosmiconfig has no sync
          // loader for them, so we just ignore them here.
          '.mjs': () => null,
        },
      })
      const result = isConfigFile ? explorer.search() : explorer.load(entry.value as string)
      return [
        {
          ...entry,
          loaded: true,
          value: result?.config || {},
        },
      ]
    },
    loadAsync: async (entry) => {
      if (!canLoadEntry(entry)) return entry
      const isConfigFile = entry.tags?.includes('configFile')
      const explorer = cosmiconfig(isConfigFile ? (entry.value as string) : '')
      const result = await (isConfigFile ? explorer.search() : explorer.load(entry.value as string))
      return [
        {
          ...entry,
          loaded: true,
          value: result?.config || {},
        },
      ]
    },
  }
}

export default cosmiconfigLoader
export type { CosmiconfigLoaderOptions }
