import deepmerge from '@fastify/deepmerge'
import type { PluginFactory } from '../types.ts'

type DeepReducerOptions = object

const deepReducer: PluginFactory<DeepReducerOptions> = () => {
  const merger = deepmerge()
  return {
    name: 'default:assignReducer',
    reduce: async (config, entry) => merger(config, entry.value) as object,
  }
}

export default deepReducer
export type { DeepReducerOptions }
