import { parseEnv } from 'node:util'
import type { PluginFactory } from '../types.ts'

type EnvLoaderOptions = object

const envLoader: PluginFactory<EnvLoaderOptions> = (options = {}) => {
  return {
    name: 'default:envLoader',
    load: async (entry) => {
      if (!entry.format?.includes('env') || typeof entry.value !== 'string') return
      try {
        entry.value = parseEnv(entry.value)
      } catch (e) {}
      return entry
    },
  }
}

export default envLoader
export type { EnvLoaderOptions }
