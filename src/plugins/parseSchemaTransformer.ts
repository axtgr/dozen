import type { Plugin } from '../types.ts'

function isParseableSchema(schema: unknown): schema is { parse: (value: unknown) => unknown } {
  return Boolean(
    schema && typeof schema === 'object' && 'parse' in schema && typeof schema.parse === 'function',
  )
}

interface ParseSchemaTransformerPluginOptions {
  schema?: unknown
}

const parseSchemaTransformerPlugin: Plugin<ParseSchemaTransformerPluginOptions> = {
  name: 'parseSchemaTransformer',
  transformSync: (config, options) => {
    if (!isParseableSchema(options.schema)) return config
    try {
      return options.schema.parse(config) as object
    } catch (e) {
      return config
    }
  },
}

export default parseSchemaTransformerPlugin
export type { ParseSchemaTransformerPluginOptions }
