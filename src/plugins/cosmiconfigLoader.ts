import { cosmiconfig, cosmiconfigSync } from 'cosmiconfig'
import type { Plugin } from '../types.ts'

interface CosmiconfigLoaderPluginOptions {
  name?: string
}

const cosmiconfigLoaderPlugin: Plugin<CosmiconfigLoaderPluginOptions> = {
  name: 'cosmiconfigLoader',
  canLoadSync: (entry) => {
    return Boolean(typeof entry.value === 'string' && entry.tags?.includes('configFile'))
  },
  loadSync: (entry) => {
    const explorer = cosmiconfigSync(entry.value as string, {
      loaders: {
        // .mjs files can only be loaded via an async import, and cosmiconfig has no sync
        // loader for them, so we just ignore them here.
        '.mjs': () => null,
      },
    })
    const result = explorer.search()
    return [
      {
        ...entry,
        loaded: true,
        value: result?.config || {},
      },
    ]
  },
  loadAsync: async (entry) => {
    const explorer = cosmiconfig(entry.value as string)
    const result = await explorer.search()
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
