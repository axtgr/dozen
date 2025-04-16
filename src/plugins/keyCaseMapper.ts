import type { PluginFactory } from '../types.ts'
import { stringCases } from '../utils.ts'

interface KeyCaseMapperOptions {
  keyCase?: keyof typeof stringCases
}

const keyCaseMapper: PluginFactory<KeyCaseMapperOptions> = () => {
  return {
    name: 'default:keyCaseMapper',
    map: async (entry, options) => {
      const changeCase = options.keyCase && stringCases[options.keyCase]
      if (!changeCase || !entry.value || typeof entry.value !== 'object') return entry
      entry.value = Object.entries(entry.value).reduce(
        (result, [key, value]) => {
          result[changeCase(key)] = value
          return result
        },
        Object.create(null) as Record<string, unknown>,
      )
      return entry
    },
  }
}

export default keyCaseMapper
export type { KeyCaseMapperOptions }
