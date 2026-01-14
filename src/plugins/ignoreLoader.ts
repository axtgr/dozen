import parseGitignore from 'parse-gitignore'
import type { Entry, PluginFactory } from '../types.ts'

function canLoadEntry(entry: Entry) {
  return Boolean(typeof entry.value === 'string' && entry.format?.includes('ignore'))
}

interface IgnoreLoaderOptions {
  /**
   * Defines what to do with ignore patterns from files like .gitignore and other sources.
   *
   * - `field`: defines the field to set to the array of ignore patterns (e.g. if `field` is set to `"exclude"`, a .gitignore file containing the two lines `dist/` and `build/` would be parsed into `{ exclude: ['dist/', 'build/'] }`). Defaults to `ignore`.
   */
  ignorePatterns?: {
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

      const field = options.ignorePatterns?.field || 'ignore'

      try {
        const { patterns } = parseGitignore.parse(entry.value as string)
        entry.value = {
          [field]: patterns,
        }
      } catch (_e) {
        entry.value = {}
      }

      return entry
    },
  }
}

export default ignoreLoader
export type { IgnoreLoaderOptions }
