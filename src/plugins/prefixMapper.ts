import type { PluginFactory } from '../types.ts'

interface PrefixMapperOptions {
  name?: string
  prefix?: {
    filter?: boolean | string
    remove?: boolean | string
    byFormat?: Record<string, { filter?: boolean; remove?: boolean }>
  }
}

const prefixMapper: PluginFactory<PrefixMapperOptions> = (options) => {
  return {
    name: 'default:prefixMapper',
    map: async (entry) => {
      if (!options.prefix) return entry

      let { filter, remove } = options.prefix

      if (options.prefix.byFormat && entry.format?.length) {
        entry.format.forEach((format) => {
          const formatOptions = options.prefix!.byFormat![format] || {}
          if ('filter' in formatOptions) filter = formatOptions.filter
          if ('remove' in formatOptions) remove = formatOptions.remove
        })
      }

      const filterPrefix = filter === true ? options.name : filter
      const removePrefix = remove === true ? options.name : remove

      if (!filterPrefix && !removePrefix) return entry

      const value = Object.entries(entry.value as object).reduce(
        (result, [key, value]) => {
          if (filterPrefix && !key.startsWith(filterPrefix)) return result
          key = removePrefix ? key.replace(removePrefix, '') : key
          result[key] = value
          return result
        },
        Object.create(null) as Record<string, unknown>,
      )

      entry.value = value
      return entry
    },
  }
}

export default prefixMapper
export type { PrefixMapperOptions }
