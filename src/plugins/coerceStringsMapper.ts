import type { Plugin } from '../types.ts'

interface CoerceTo {
  boolean?: boolean
  number?: boolean
}

type CoerceStringsMapperPluginOptions = {
  coerceStrings?:
    | boolean
    | (CoerceTo & {
        byTag?: boolean | Record<string, CoerceTo>
      })
}

const coerceStringsMapperPlugin: Plugin<CoerceStringsMapperPluginOptions> = {
  name: 'coerceStringsMapper',
  mapSync: (entry, options) => {
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

      if (options.coerceStrings.byTag) {
        entry.tags?.forEach((tag) => {
          const tagOptions: CoerceTo | boolean = (options.coerceStrings as any).byTag[tag] || {}
          if (typeof tagOptions === 'boolean') {
            coerceTo.boolean = tagOptions
            coerceTo.number = tagOptions
          } else if (typeof tagOptions.boolean !== 'undefined') {
            coerceTo.boolean = tagOptions.boolean
          } else if (typeof tagOptions.number !== 'undefined') {
            coerceTo.number = tagOptions.number
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
          if (lowerCaseValue === 'true' || lowerCaseValue === '1') {
            result[key] = true
            return result
          }
          if (lowerCaseValue === 'false' || lowerCaseValue === '0') {
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

    return {
      ...entry,
      value,
    }
  },
}

export default coerceStringsMapperPlugin
export type { CoerceStringsMapperPluginOptions }
