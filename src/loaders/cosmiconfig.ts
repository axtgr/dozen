import { cosmiconfig, cosmiconfigSync } from 'cosmiconfig'
import type { Loader } from '../types.ts'

interface CosmiconfigLoaderOptions {
  name?: string
}

const cosmiconfigLoader: Loader<CosmiconfigLoaderOptions> = {
  name: 'cosmiconfig',
  canLoadSync: (entry) => {
    return Boolean(entry.tags?.includes('dir') || entry.tags?.includes('file'))
  },
  loadSync: (entry, options) => {
    const searchPlaces = Array.isArray(entry.value) ? entry.value : [entry.value]
    const explorer = cosmiconfigSync(options.name || '', {
      searchPlaces,
      // .mjs files can only be loaded via an async import, and cosmiconfig has no sync
      // loader for them, so we just ignore them here.
      loaders: {
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
  canLoadAsync: async (entry) => {
    return Boolean(entry.tags?.includes('dir') || entry.tags?.includes('file'))
  },
  loadAsync: async (entry, options) => {
    const searchPlaces = Array.isArray(entry.value) ? entry.value : [entry.value]
    const explorer = cosmiconfig(options.name || '', { searchPlaces })
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

export default cosmiconfigLoader
