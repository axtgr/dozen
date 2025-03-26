import dotenv from 'dotenv'
import type { Loader } from '../types.ts'

interface DotenvLoaderOptions {
  name?: string
}

const dotenvLoader: Loader<DotenvLoaderOptions> = {
  name: 'dotenv',
  canLoadSync: (entry) => {
    return Boolean(entry.tags?.includes('file') && entry.tags.includes('env'))
  },
  loadSync: (entry) => {
    const { error, parsed } = dotenv.config({
      path: entry.value as string | string[],
      processEnv: {},
    })
    if (error) {
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

export default dotenvLoader
