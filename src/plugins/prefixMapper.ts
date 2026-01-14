import type { PluginFactory } from '../types.ts'

interface PrefixMapperOptions {
  name?: string
  /**
   * Specifies how key prefixes are handled. For example, only keys starting with "myapp_" could be kept and then that prefix removed (`myapp_key` → `key`).
   *
   * - `filter`: when true, only keys starting with `name` will be kept; when a string, only keys starting with that string will be kept; when false, all keys will be kept.
   * - `remove`: when true, the prefix matching `name` will be removed from keys; when a string, the prefix matching that string will be removed; when false, no prefix will be removed.
   * - `byFormat`: an object that specifies prefix options for each format separately (e.g. `env: { filter: true, remove: false }`)
   */
  prefix?: {
    filter?: boolean | string
    remove?: boolean | string
    byFormat?: Record<string, { filter?: boolean | string; remove?: boolean | string }>
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
