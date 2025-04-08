import { parseEnv } from 'node:util'
import type { PluginFactory } from '../types.ts'

type EnvMapperOptions = object

const envMapper: PluginFactory<EnvMapperOptions> = (options = {}) => {
  return {
    name: 'default:envMapper',
    map: async (entry) => {
      if (!entry.format?.includes('env') || typeof entry.value !== 'string') return entry
      try {
        entry.value = parseEnv(entry.value)
      } catch (e) {}
      return entry
    },
  }
}

export default envMapper
export type { EnvMapperOptions }
