import type { Transformer } from '../types.ts'

function isParseableSchema(schema: unknown): schema is { parse: (value: unknown) => unknown } {
  return Boolean(
    schema && typeof schema === 'object' && 'parse' in schema && typeof schema.parse === 'function',
  )
}

interface ParseSchemaTransformerOptions {
  schema?: unknown
}

const parseSchemaTransformer: Transformer<ParseSchemaTransformerOptions> = {
  name: 'parseSchema',
  transformSync: (config, options) => {
    if (!isParseableSchema(options.schema)) return config
    try {
      return options.schema.parse(config) as object
    } catch (e) {
      return config
    }
  },
}

export default parseSchemaTransformer
export type { ParseSchemaTransformerOptions }
