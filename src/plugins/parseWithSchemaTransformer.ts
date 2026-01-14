import type { PluginFactory } from '../types.ts'

interface ParseWithSchemaTransformerOptions {
  schema?: unknown
  /**
   * If the `schema` option is set, and this value is true or undefined, Dozen will attempt to call `schema.parse(config)`; if this value is a function, it will be called instead.
   */
  parseWithSchema?: boolean | ((config: object, schema: unknown) => Promise<object> | object)
}

const parseWithSchemaTransformer: PluginFactory<ParseWithSchemaTransformerOptions> = (options) => {
  const { schema, parseWithSchema } = options
  return {
    name: 'default:parseWithSchemaTransformer',
    transform: async (config) => {
      if (!schema) return config

      if (typeof parseWithSchema === 'function') {
        return parseWithSchema(config, schema)
      }

      if (
        (parseWithSchema === true || parseWithSchema === undefined) &&
        typeof schema === 'object' &&
        'parse' in schema &&
        typeof schema.parse === 'function'
      ) {
        return schema.parse(config)
      }

      return config
    },
  }
}

export default parseWithSchemaTransformer
export type { ParseWithSchemaTransformerOptions }
