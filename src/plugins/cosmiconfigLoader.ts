import { FSWatcher } from 'chokidar'
import { cosmiconfig } from 'cosmiconfig'
import type { Entry, PluginFactory, PluginWatchCb } from '../types.ts'

function createWatcher() {
  const watchedEntries = new Map<string, Entry>()
  const watchCbs = new Set<PluginWatchCb>()
  let chokidar: FSWatcher | undefined

  const onChange = (eventName: string, filePath: string) => {
    if (eventName === 'error') return
    if (watchedEntries.has(filePath)) {
      const entry = watchedEntries.get(filePath)!
      entry.status = 'pending'
      watchCbs.forEach((cb) => cb(undefined, entry))
    } else {
      chokidar?.unwatch(filePath)
    }
  }

  const onError = (err: unknown) => {
    watchCbs.forEach((cb) => cb(err))
  }

  return {
    add(filePath: string, entry: Entry) {
      chokidar?.add(filePath)
      watchedEntries.set(filePath, entry)
    },
    async watch(cb: PluginWatchCb) {
      watchCbs.add(cb)
      if (watchCbs.size === 1) {
        chokidar = new FSWatcher({
          ignoreInitial: true,
        })
        chokidar.on('all', onChange)
        chokidar.on('error', onError)
        watchedEntries.keys().forEach((filePath) => chokidar!.add(filePath))
      }
    },
    async unwatch(cb: (err?: unknown, entry?: Entry) => void) {
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
