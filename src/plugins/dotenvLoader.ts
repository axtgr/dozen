import dotenv from 'dotenv'
import type { PluginFactory } from '../types.ts'

type DotenvLoaderOptions = object

const dotenvLoader: PluginFactory<DotenvLoaderOptions> = () => {
  return {
    name: 'dotenvLoader',
    canLoadSync: (entry) => {
      return Boolean(entry.tags?.includes('file') && entry.tags.includes('env'))
    },
    loadSync: (entry) => {
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
