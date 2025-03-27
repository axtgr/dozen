import type { Plugin } from '../types.ts'

type AssignReducerPluginOptions = object

const assignReducerPlugin: Plugin<AssignReducerPluginOptions> = {
  name: 'assignReducer',
  reduceSync: (config, entry) => Object.assign(config, entry.value),
}

export default assignReducerPlugin
export type { AssignReducerPluginOptions }
