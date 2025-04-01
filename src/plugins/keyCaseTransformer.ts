import type { PluginFactory } from '../types.ts'
import { stringCases } from '../utils.ts'

interface KeyCaseTransformerOptions {
  keyCase?: keyof typeof stringCases
}

const keyCaseTransformer: PluginFactory<KeyCaseTransformerOptions> = (options = {}) => {
  return {
    name: 'keyCaseTransformer',
    transform: async (config) => {
      const changeCase = options.keyCase && stringCases[options.keyCase]

      if (!changeCase) return config

      return Object.entries(config).reduce(
        (result, [key, value]) => {
          result[changeCase(key)] = value
          return result
        },
        Object.create(null) as Record<string, unknown>,
      )
    },
  }
}

export default keyCaseTransformer
export type { KeyCaseTransformerOptions }
