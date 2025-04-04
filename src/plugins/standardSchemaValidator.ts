import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { PluginFactory } from '../types.ts'

interface StandardSchemaValidatorOptions {
  schema?: StandardSchemaV1
}

const standardSchemaValidator: PluginFactory<StandardSchemaValidatorOptions> = () => {
  return {
    name: 'default:standardSchemaValidator',
    validate: async (config, { schema }) => {
      if (!schema) return

      const result = await schema['~standard'].validate(config)

      if (result.issues) {
        throw new Error(JSON.stringify(result.issues, null, 2))
      }
    },
  }
}

export default standardSchemaValidator
export type { StandardSchemaValidatorOptions }
