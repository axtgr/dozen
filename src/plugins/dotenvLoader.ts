import dotenv from 'dotenv'
import type { Entry, PluginFactory } from '../types.ts'

function canLoadEntry(entry: Entry) {
  return entry.tags?.includes('file') && entry.tags.includes('env')
}

type DotenvLoaderOptions = object

const dotenvLoader: PluginFactory<DotenvLoaderOptions> = () => {
  return {
    name: 'dotenvLoader',
    load: async (entry) => {
      if (!canLoadEntry(entry)) return entry
      const { error, parsed } = dotenv.config({
        path: entry.value as string | string[],
        processEnv: {},
      })
      if (error && (error as any).code !== 'ENOENT') {
        throw error
      }
      return [
        {
          ...entry,
          loaded: true,
          value: parsed,
        },
      ]
    },
  }
}

export default dotenvLoader
export type { DotenvLoaderOptions }
