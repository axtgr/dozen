import type { PluginFactory } from '../types.ts'

type FlattenProperty =
  | boolean
  | string
  | {
      ignoreBase?: boolean
      key: string | boolean
    }

interface FlattenPropertyMapperOptions {
  name?: string
  flattenProperty?: FlattenProperty & { byFormat: Record<string, FlattenProperty> }
}

const flattenPropertyMapper: PluginFactory<FlattenPropertyMapperOptions> = (options) => {
  return {
    name: 'default:flattenPropertyMapper',
    map: async (entry) => {
      if (!options.flattenProperty || entry.meta?.flattenProperty) return entry

      let keyToFlatten: string | boolean | undefined
      let ignoreBase = false

      if (options.flattenProperty === true) {
        keyToFlatten = true
      } else if (typeof options.flattenProperty === 'string') {
        keyToFlatten = options.flattenProperty
      } else {
        keyToFlatten = options.flattenProperty.key
        ignoreBase = Boolean(options.flattenProperty.ignoreBase)

        if (options.flattenProperty.byFormat) {
          entry.format?.forEach((format) => {
            const formatOptions = options.flattenProperty!.byFormat[format]

            if (formatOptions === true) {
              keyToFlatten = true
            } else if (typeof formatOptions === 'string') {
              keyToFlatten = formatOptions
            } else if (formatOptions) {
              keyToFlatten = formatOptions.key
              ignoreBase = Boolean(formatOptions.ignoreBase)
            }
          })
        }
      }

      if (keyToFlatten === true) {
        keyToFlatten = options.name
      }

      if (!keyToFlatten) return entry

      const base = entry.value as any
      const keyValue = base[keyToFlatten]

      if ((!keyValue || typeof keyValue !== 'object') && !ignoreBase) {
        return entry
      }

      const newEntry = {
        id: `flattenProperty:${keyToFlatten}:${entry.id}`,
        value: keyValue,
        format: entry.format?.filter((f) => f !== 'object').concat('object'),
        meta: { ...entry.meta, flattenProperty: { key: keyToFlatten } },
      }

      if (ignoreBase) {
        entry.value = {}
      } else {
        delete base[keyToFlatten]
      }

      return [entry, newEntry]
    },
  }
}

export default flattenPropertyMapper
export type { FlattenPropertyMapperOptions }
