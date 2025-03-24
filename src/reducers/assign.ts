import type { Reducer } from '../types.ts'

const assignReducer: Reducer = {
  name: 'assign',
  reduceSync: (config, entry) => Object.assign(config, entry.value),
}

export default assignReducer
