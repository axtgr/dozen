import { cosmiconfig } from 'cosmiconfig'
import { createFileWatcher } from '../fileWatcher.ts'
import type { Entry, PluginFactory } from '../types.ts'

function canLoadEntry(entry: Entry) {
  return (
    typeof entry.value === 'string' &&
    (entry.format?.includes('configFile') || entry.format?.includes('file'))
  )
}

interface CosmiconfigLoaderOptions {
  name?: string
}

const cosmiconfigLoader: PluginFactory<CosmiconfigLoaderOptions> = () => {
  const watcher = createFileWatcher()
  return {
    name: 'default:cosmiconfigLoader',
    load: async (entry) => {
      if (!canLoadEntry(entry)) return
      const isConfigFile = entry.format?.includes('configFile')
      const explorer = cosmiconfig(isConfigFile ? (entry.value as string) : '')
      const result = await (isConfigFile
        ? explorer.search()
        : explorer.load(entry.value as string)
      ).catch(() => {})
      const newEntry = { ...entry, format: [...(entry.format || [])] }
      newEntry.value = result?.config || {}
      if (result) {
        newEntry.meta ??= {}
        newEntry.meta.filePath = result.filepath
        watcher.add(result.filepath, entry)
      }
      return newEntry
    },
    watch: async (cb) => {
      watcher.watch(cb)
    },
    unwatch: async (cb) => {
      await watcher.unwatch(cb)
    },
  }
}

export default cosmiconfigLoader
export type { CosmiconfigLoaderOptions }
