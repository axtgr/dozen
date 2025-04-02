import type { PluginFactory } from '../types.ts'
import { stringCases } from '../utils.ts'

interface KeyCaseMapperOptions {
  keyCase?: keyof typeof stringCases
}

const keyCaseMapper: PluginFactory<KeyCaseMapperOptions> = (options = {}) => {
  const changeCase = options.keyCase && stringCases[options.keyCase]
  return {
    name: 'default:keyCaseMapper',
    map: async (entry) => {
      if (!changeCase || !entry.value || typeof entry.value !== 'object') return entry
      entry.value = Object.entries(entry.value).reduce(
        (result, [key, value]) => {
          result[changeCase(key)] = value
          return result
        },
        Object.create(null) as Record<string, unknown>,
      )
    },
  }
}

export default keyCaseMapper
export type { KeyCaseMapperOptions }
