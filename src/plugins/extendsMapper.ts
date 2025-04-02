import Path from 'node:path'
import type { PluginFactory } from '../types.ts'

interface ExtendsMapperOptions {
  extendsProperty?: string
}

const extendsMapper: PluginFactory<ExtendsMapperOptions> = (options) => {
  return {
    name: 'extendsMapper',
    map: async (entry) => {
      if (!options.extendsProperty || !entry.value || typeof entry.value !== 'object') return entry

      const extend =
        options.extendsProperty in entry.value
          ? (entry.value as any)[options.extendsProperty]
          : entry.value

      if (typeof extend !== 'string') return entry

      const basePath = typeof entry.meta?.filePath === 'string' ? entry.meta?.filePath : undefined
      const value = basePath ? Path.resolve(basePath, extend) : extend
      const newEntry = { id: value, format: ['file'], value }

      delete (entry.value as any)[options.extendsProperty]

      return [newEntry, entry]
    },
  }
}

export default extendsMapper
export type { ExtendsMapperOptions }
