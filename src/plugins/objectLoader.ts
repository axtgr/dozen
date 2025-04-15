import type { Entry, PluginFactory } from '../types.ts'

function canLoadEntry(entry: Entry) {
  return entry.format?.includes('object') && entry.value && typeof entry.value === 'object'
}

type ObjectLoaderOptions = object

const objectLoader: PluginFactory<ObjectLoaderOptions> = () => {
  return {
    name: 'default:objectLoader',
    load: async (entry) => {
      if (canLoadEntry(entry)) {
        return entry
      }
    },
  }
}

export default objectLoader
export type { ObjectLoaderOptions }
