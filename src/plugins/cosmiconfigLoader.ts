import { FSWatcher } from 'chokidar'
import { cosmiconfig } from 'cosmiconfig'
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
  const watcher = new FSWatcher({
    ignoreInitial: true,
  })
  const watchedEntries = new Map<string, Entry>()
  const watchCbs = new Set<(entry: Entry) => void>()

  watcher.on('all', (_event, filePath) => {
    if (watchedEntries.has(filePath)) {
      const entry = watchedEntries.get(filePath)!
      entry.status = 'pending'
      watchCbs.forEach((cb) => cb(entry))
    } else {
      watcher.unwatch(filePath)
    }
  })

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
      newEntry.status = 'loaded'
      newEntry.value = result?.config || {}
      if (result) {
        newEntry.meta ??= {}
        newEntry.meta.filePath = result.filepath
        watcher?.add(result.filepath)
        watchedEntries.set(result.filepath, entry)
      }
      return newEntry
    },
    watch: async (cb) => {
      watchCbs.add(cb)
    },
    unwatch: async (cb) => {
      watchCbs.delete(cb)
      if (!watchCbs.size) {
        watchedEntries.clear()
        await watcher.close()
      }
    },
  }
}

export default cosmiconfigLoader
export type { CosmiconfigLoaderOptions }
