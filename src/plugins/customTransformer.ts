import type { PluginFactory } from '../types.ts'

interface CustomTransformerOptions {
  transform?: (config: object, options: object) => Promise<object> | object
}

const customTransformer: PluginFactory<CustomTransformerOptions> = (options) => {
  const { transform } = options
  return {
    name: 'default:customTransformer',
    transform: async (config) => {
      if (!transform) return config
      return transform(config, options)
    },
  }
}

export default customTransformer
export type { CustomTransformerOptions }
