import type { PluginFactory } from '../types.ts'

type FlattenProperty =
  | boolean
  | string
  | {
      keepBase?: boolean
      key: string | boolean
    }

interface FlattenPropertyMapperOptions {
  name?: string
  /**
   * The property of a value to use instead of the value itself. For example, when it's "foo", the entry `{ foo: { bar: 'baz' } }` will be replaced with `{ bar: 'baz' }`.
   *
   * When true, uses the `name` option; when false, doesn't flatten anything; when a string, uses that property.
   *
   * When `keepBase` is true, it will merge the property into its parent object, otherwise it will replace it (default).
   *
   * `byFormat`: an object that specifies flattenProperty options for each format separately (e.g. `env: { key: true, keepBase: true }`).
   *
   * By default this is used to replace `package.json` entries with the value of their property whose key equals the `name` option.
   */
  flattenProperty?: FlattenProperty & { byFormat: Record<string, FlattenProperty> }
}

const flattenPropertyMapper: PluginFactory<FlattenPropertyMapperOptions> = (options) => {
  return {
    name: 'default:flattenPropertyMapper',
    map: async (entry) => {
      if (!options.flattenProperty || entry.meta?.flattenProperty) return entry

      let keyToFlatten: string | boolean | undefined
      let keepBase = false

      if (options.flattenProperty === true) {
        keyToFlatten = true
      } else if (typeof options.flattenProperty === 'string') {
        keyToFlatten = options.flattenProperty
      } else {
        keyToFlatten = options.flattenProperty.key
        keepBase = Boolean(options.flattenProperty.keepBase)

        if (options.flattenProperty.byFormat) {
          entry.format?.forEach((format) => {
            const formatOptions = options.flattenProperty!.byFormat[format]

            if (formatOptions === true) {
              keyToFlatten = true
            } else if (typeof formatOptions === 'string') {
              keyToFlatten = formatOptions
            } else if (formatOptions) {
              keyToFlatten = formatOptions.key
              keepBase = Boolean(formatOptions.keepBase)
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

      if ((!keyValue || typeof keyValue !== 'object') && keepBase) {
        return entry
      }

      const newEntry = {
        id: `flattenProperty:${keyToFlatten}:${entry.id}`,
        value: keyValue,
        format: entry.format?.filter((f) => f !== 'object').concat('object'),
        meta: { ...entry.meta, flattenProperty: { key: keyToFlatten } },
      }

      if (!keepBase) {
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
