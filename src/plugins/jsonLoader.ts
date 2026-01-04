import Json5 from 'json5'
import type { Entry, PluginFactory } from '../types.ts'

function canLoadEntry(entry: Entry) {
  return Boolean(
    typeof entry.value === 'string' &&
      (entry.format?.includes('json') ||
        entry.format?.includes('json5') ||
        entry.format?.includes('jsonc')),
  )
}

type JsonLoaderOptions = object

const jsonLoader: PluginFactory<JsonLoaderOptions> = (_options = {}) => {
  return {
    name: 'default:jsonLoader',
    load: async (entry) => {
      if (!canLoadEntry(entry)) {
        return
      }

      try {
        const value = (entry.value as string).trim()
        entry.value = value.length ? Json5.parse(value) : {}
      } catch (_e) {}
      return entry
    },
  }
}

export default jsonLoader
export type { JsonLoaderOptions }
