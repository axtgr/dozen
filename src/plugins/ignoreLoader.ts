import parseGitignore from 'parse-gitignore'
import type { Entry, PluginFactory } from '../types.ts'

function canLoadEntry(entry: Entry) {
  return Boolean(typeof entry.value === 'string' && entry.format?.includes('ignore'))
}

interface IgnoreLoaderOptions {
  ignore?: {
    field?: string
  }
}

const ignoreLoader: PluginFactory<IgnoreLoaderOptions> = (options = {}) => {
  return {
    name: 'default:ignoreLoader',
    load: async (entry) => {
      if (!canLoadEntry(entry)) {
        return
      }

      const field = options.ignore?.field || 'ignore'

      try {
        const { patterns } = parseGitignore.parse(entry.value as string)
        entry.value = {
          [field]: patterns,
        }
      } catch (e) {
        entry.value = {}
      }

      return entry
    },
  }
}

export default ignoreLoader
export type { IgnoreLoaderOptions }
