import type { PluginFactory } from '../types.ts'

interface CoerceTo {
  boolean?: boolean
  number?: boolean
}

interface CoerceStringsMapperOptions {
  coerceStrings?:
    | boolean
    | (CoerceTo & {
        byFormat?: Record<string, boolean | CoerceTo>
      })
}

const coerceStringsMapper: PluginFactory<CoerceStringsMapperOptions> = () => {
  return {
    name: 'default:coerceStringsMapper',
    map: async (entry, options) => {
      if (!options.coerceStrings) return entry

      let coerceTo: CoerceTo

      if (options.coerceStrings === true) {
        coerceTo = {
          boolean: true,
          number: true,
        }
      } else {
        coerceTo = {
          boolean: options.coerceStrings.boolean,
          number: options.coerceStrings.number,
        }

        if (options.coerceStrings.byFormat) {
          entry.format?.forEach((format) => {
            const formatOptions: CoerceTo | boolean =
              (options.coerceStrings as any).byFormat[format] || {}
            if (typeof formatOptions === 'boolean') {
              coerceTo.boolean = formatOptions
              coerceTo.number = formatOptions
            } else if (typeof formatOptions.boolean !== 'undefined') {
              coerceTo.boolean = formatOptions.boolean
            } else if (typeof formatOptions.number !== 'undefined') {
              coerceTo.number = formatOptions.number
            }
          })
        }
      }

      if (!coerceTo.boolean && !coerceTo.number) return entry

      const value = Object.entries(entry.value as object).reduce(
        (result, [key, value]) => {
          if (typeof value !== 'string') {
            result[key] = value
            return result
          }

          if (coerceTo.boolean) {
            const lowerCaseValue = value.toLowerCase()
            if (lowerCaseValue === 'true') {
              result[key] = true
              return result
            }
            if (lowerCaseValue === 'false') {
              result[key] = false
              return result
            }
          }

          if (coerceTo.number) {
            const number = parseFloat(value)
            if (!Number.isNaN(number)) {
              result[key] = number
              return result
            }
          }

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

export default coerceStringsMapper
export type { CoerceStringsMapperOptions }
