import type { PluginFactory } from '../types.ts'

interface ParseTransformerOptions {
  schema?: unknown
  parse?: (config: object, schema: unknown) => Promise<object>
}

const parseTransformer: PluginFactory<ParseTransformerOptions> = (options) => {
  return {
    name: 'default:parseTransformer',
    transform: async (config) => {
      if (!options.schema || typeof options.schema !== 'object') return config

      if (options.parse) {
        return options.parse(config, options.schema)
      }

      if ('parse' in options.schema && typeof options.schema.parse === 'function') {
        return options.schema.parse(config)
      }

      return config
    },
  }
}

export default parseTransformer
export type { ParseTransformerOptions }
