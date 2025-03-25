import type { Mapper } from '../types.ts'

interface RemovePrefixMapperOptions {
  name?: string
  removePrefix?: boolean | string[]
}

const removePrefixMapper: Mapper<RemovePrefixMapperOptions> = {
  name: 'removePrefix',
  mapSync: (entry, options) => {
    let value = entry.value
    const removePrefix =
      options.removePrefix === true ||
      (Array.isArray(options.removePrefix) &&
        entry.tags?.length &&
        options.removePrefix.find((tag) => entry.tags?.includes(tag)))

    if (removePrefix && value && typeof value === 'object' && options.name) {
      const prefixRegExp = new RegExp(`^${options.name.toUpperCase()}_`)
      value = Object.fromEntries(
        Object.entries(value).map(([key, value]) => [key.replace(prefixRegExp, ''), value]),
      )
    }

    return { ...entry, value }
  },
}

export default removePrefixMapper
export type { RemovePrefixMapperOptions }
