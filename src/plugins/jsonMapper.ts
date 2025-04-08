import type { PluginFactory } from '../types.ts'

type JsonMapperOptions = object

const jsonMapper: PluginFactory<JsonMapperOptions> = (options = {}) => {
  return {
    name: 'default:jsonMapper',
    map: async (entry) => {
      if (!entry.format?.includes('json') || typeof entry.value !== 'string') return entry
      try {
        entry.value = JSON.parse(entry.value)
      } catch (e) {}
      return entry
    },
  }
}

export default jsonMapper
export type { JsonMapperOptions }
