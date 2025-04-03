import { FSWatcher } from 'chokidar'
import { cosmiconfig } from 'cosmiconfig'
import type { Entry, PluginFactory } from '../types.ts'

function createWatcher() {
  const watchedEntries = new Map<string, Entry>()
  const watchCbs = new Set<(entry: Entry) => void>()
  let chokidar: FSWatcher | undefined

  const onChange = (_eventName: string, filePath: string) => {
    if (watchedEntries.has(filePath)) {
      const entry = watchedEntries.get(filePath)!
      entry.status = 'pending'
      watchCbs.forEach((cb) => cb(entry))
    } else {
      chokidar?.unwatch(filePath)
    }
  }

  return {
    add(filePath: string, entry: Entry) {
      chokidar?.add(filePath)
      watchedEntries.set(filePath, entry)
    },
    async watch(cb: (entry: Entry) => void) {
      watchCbs.add(cb)
      if (watchCbs.size === 1) {
        chokidar = new FSWatcher({
          ignoreInitial: true,
        })
        chokidar.on('all', onChange)
        watchedEntries.keys().forEach((filePath) => chokidar!.add(filePath))
      }
    },
    async unwatch(cb: (entry: Entry) => void) {
      watchCbs.delete(cb)
      if (!watchCbs.size) {
        await chokidar?.close()
        chokidar = undefined
        return false
      }
      return true
    },
  }
}

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
  const watcher = createWatcher()

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
        watcher.add(result.filepath, newEntry)
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
