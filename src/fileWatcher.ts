// @parcel/watcher is supposed to be better than chokidar, but it doesn't work in Bun.js
import { FSWatcher } from 'chokidar'
import type { Entry, PluginWatchCb } from './types.ts'

function createFileWatcher() {
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

export { createFileWatcher }
