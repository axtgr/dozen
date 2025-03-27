import type { Plugin } from '../types.ts'
import { stringCases } from '../utils.ts'

interface KeyCaseTransformerPluginOptions {
  keyCase?: keyof typeof stringCases
}

const keyCaseTransformerPlugin: Plugin<KeyCaseTransformerPluginOptions> = {
  name: 'keyCaseTransformer',
  transformSync: (config, options) => {
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

export default keyCaseTransformerPlugin
export type { KeyCaseTransformerPluginOptions }
