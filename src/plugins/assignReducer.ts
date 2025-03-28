import type { PluginFactory } from '../types.ts'

type AssignReducerOptions = object

const assignReducer: PluginFactory<AssignReducerOptions> = () => {
  return {
    name: 'assignReducer',
    reduceSync: (config, entry) => Object.assign(config, entry.value),
  }
}

export default assignReducer
export type { AssignReducerOptions }
