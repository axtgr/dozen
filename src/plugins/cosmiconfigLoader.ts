import { cosmiconfig, cosmiconfigSync } from 'cosmiconfig'
import type { Plugin } from '../types.ts'

interface CosmiconfigLoaderPluginOptions {
  name?: string
}

const cosmiconfigLoaderPlugin: Plugin<CosmiconfigLoaderPluginOptions> = {
  name: 'cosmiconfigLoader',
  canLoadSync: (entry) => {
    return Boolean(
      typeof entry.value === 'string' &&
        (entry.tags?.includes('configFile') || entry.tags?.includes('file')),
    )
  },
  loadSync: (entry) => {
    const isConfigFile = Boolean(entry.tags?.includes('configFile'))
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
    const isConfigFile = Boolean(entry.tags?.includes('configFile'))
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

export default cosmiconfigLoaderPlugin
export type { CosmiconfigLoaderPluginOptions }
