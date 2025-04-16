import type { PluginFactory } from '../types.ts'

type PickProperty =
  | boolean
  | string
  | {
      ignoreBase?: boolean
      key: string | boolean
    }

interface PickPropertyMapperOptions {
  name?: string
  pickProperty?: PickProperty & { byFormat: Record<string, PickProperty> }
}

const pickPropertyMapper: PluginFactory<PickPropertyMapperOptions> = (options) => {
  return {
    name: 'default:pickPropertyMapper',
    map: async (entry) => {
      if (!options.pickProperty || entry.meta?.pickedProperty) return entry

      let keyToPick: string | boolean | undefined
      let ignoreBase = false

      if (options.pickProperty === true) {
        keyToPick = true
      } else if (typeof options.pickProperty === 'string') {
        keyToPick = options.pickProperty
      } else {
        keyToPick = options.pickProperty.key
        ignoreBase = Boolean(options.pickProperty.ignoreBase)

        if (options.pickProperty.byFormat) {
          entry.format?.forEach((format) => {
            const formatOptions = options.pickProperty!.byFormat[format]

            if (formatOptions === true) {
              keyToPick = true
            } else if (typeof formatOptions === 'string') {
              keyToPick = formatOptions
            } else if (formatOptions) {
              keyToPick = formatOptions.key
              ignoreBase = Boolean(formatOptions.ignoreBase)
            }
          })
        }
      }

      if (keyToPick === true) {
        keyToPick = options.name
      }

      if (!keyToPick) return entry

      const base = entry.value as any
      const keyValue = base[keyToPick]

      if ((!keyValue || typeof keyValue !== 'object') && !ignoreBase) {
        return entry
      }

      const newEntry = {
        id: `pickProperty:${keyToPick}:${entry.id}`,
        value: keyValue,
        format: entry.format?.filter((f) => f !== 'object').concat('object'),
        meta: { ...entry.meta, pickedProperty: keyToPick },
      }

      if (ignoreBase) {
        entry.value = {}
      } else {
        delete base[keyToPick]
      }

      return [entry, newEntry]
    },
  }
}

export default pickPropertyMapper
export type { PickPropertyMapperOptions }
