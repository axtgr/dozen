import type { Plugin } from '../types.ts'

interface PrefixMapperPluginOptions {
  name?: string
  prefix?: {
    filter?: boolean | string
    remove?: boolean | string
    byTag?: Record<string, { filter?: boolean; remove?: boolean }>
  }
}

const prefixMapperPlugin: Plugin<PrefixMapperPluginOptions> = {
  name: 'prefixMapper',
  mapSync: (entry, options) => {
    if (!options.prefix) return entry

    let { filter, remove } = options.prefix

    if (options.prefix.byTag && entry.tags?.length) {
      entry.tags.forEach((tag) => {
        const tagOptions = options.prefix!.byTag![tag] || {}
        if ('filter' in tagOptions) filter = tagOptions.filter
        if ('remove' in tagOptions) remove = tagOptions.remove
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

    return {
      ...entry,
      value,
    }
  },
}

export default prefixMapperPlugin
export type { PrefixMapperPluginOptions }
