import Path from 'node:path'
import { cosmiconfig, cosmiconfigSync } from 'cosmiconfig'
import type { Loader } from '../types.ts'

function isEnvFile(path: string) {
  const basename = Path.basename(path)
  return /^\.env(\..+)?$/.test(basename)
}

const envSymbol = Symbol('env')

function envLoader(path: string) {
  return isEnvFile(path) ? { [envSymbol]: true, path } : null
}

const envLoaders = {
  '.local': envLoader,
  '.production': envLoader,
  '.development': envLoader,
  '.test': envLoader,
  '.staging': envLoader,
  noExt: envLoader,
}

interface CosmiconfigLoaderOptions {
  name?: string
}

const cosmiconfigLoader: Loader<CosmiconfigLoaderOptions> = {
  name: 'cosmiconfig',
  canLoadSync: (entry) => {
    return Boolean(entry.tags?.includes('file') && !entry.tags.includes('env'))
  },
  loadSync: (entry, options) => {
    const searchPlaces = Array.isArray(entry.value) ? entry.value : [entry.value]
    const explorer = cosmiconfigSync(options.name || '', {
      searchPlaces,
      loaders: {
        // .mjs files can only be loaded via an async import, and cosmiconfig has no sync
        // loader for them, so we just ignore them here.
        '.mjs': () => null,
        ...envLoaders,
      },
    })

    const result = explorer.search()

    if (result?.config?.[envSymbol]) {
      return [
        {
          id: result.config.path,
          parentId: entry.id,
          tags: ['file', 'env'],
          value: result.config.path,
        },
      ]
    } else {
      return [
        {
          ...entry,
          loaded: true,
          value: result?.config || {},
        },
      ]
    }
  },
  loadAsync: async (entry, options) => {
    const searchPlaces = Array.isArray(entry.value) ? entry.value : [entry.value]
    const explorer = cosmiconfig(options.name || '', { searchPlaces, loaders: envLoaders })

    const result = await explorer.search()

    if (result?.config?.[envSymbol]) {
      return [
        {
          id: result.config.path,
          parentId: entry.id,
          tags: ['file', 'env'],
          value: result.config.path,
        },
      ]
    } else {
      return [
        {
          ...entry,
          loaded: true,
          value: result?.config || {},
        },
      ]
    }
  },
}

export default cosmiconfigLoader
