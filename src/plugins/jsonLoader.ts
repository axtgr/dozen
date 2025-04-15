import type { PluginFactory } from '../types.ts'

type JsonLoaderOptions = object

const jsonLoader: PluginFactory<JsonLoaderOptions> = (options = {}) => {
  return {
    name: 'default:jsonLoader',
    load: async (entry) => {
      if (!entry.format?.includes('json') || typeof entry.value !== 'string') return
      try {
        const value = entry.value.trim()
        entry.value = value.length ? JSON.parse(entry.value) : {}
      } catch (e) {}
      return entry
    },
  }
}

export default jsonLoader
export type { JsonLoaderOptions }
