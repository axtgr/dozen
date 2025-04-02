import dotenv from 'dotenv'
import type { Entry, PluginFactory } from '../types.ts'

function canLoadEntry(entry: Entry) {
  return entry.format?.includes('file') && entry.format.includes('env')
}

type DotenvLoaderOptions = object

const dotenvLoader: PluginFactory<DotenvLoaderOptions> = () => {
  return {
    name: 'dotenvLoader',
    load: async (entry) => {
      if (!canLoadEntry(entry)) return
      const { error, parsed } = dotenv.config({
        path: entry.value as string | string[],
        processEnv: {},
      })
      if (error && (error as any).code !== 'ENOENT') {
        throw error
      }
      entry.status = 'loaded'
      entry.value = parsed
      return entry
    },
  }
}

export default dotenvLoader
export type { DotenvLoaderOptions }
