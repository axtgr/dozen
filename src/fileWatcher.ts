import Path from 'node:path'
// @parcel/watcher is supposed to be better than chokidar, but it doesn't work in Bun.js
import { FSWatcher } from 'chokidar'
import type { Entry, PluginWatchCb } from './types.ts'

function createFileWatcher() {
  const watchedEntries = new Map<string, [Entry, Entry?]>()
  const watchCbs = new Set<PluginWatchCb>()
  let chokidar: FSWatcher | undefined

  const onChange = (eventName: string, filePath: string) => {
    if (eventName === 'error') return
    filePath = Path.normalize(filePath)
    if (watchedEntries.has(filePath)) {
      let [parentEntry, childEntry] = watchedEntries.get(filePath)!
      parentEntry = { ...parentEntry }
      if (!childEntry || ['add', 'unlink'].includes(eventName)) {
        watchCbs.forEach((cb) => cb(undefined, parentEntry))
      } else {
        childEntry = { ...childEntry }
        watchCbs.forEach((cb) => cb(undefined, childEntry, parentEntry))
      }
    }
  }

  const onError = (err: unknown) => {
    watchCbs.forEach((cb) => cb(err))
  }

  return {
    /**
     * Adds a file path to the watcher.
     */
    add(filePath: string, parentEntry: Entry, childEntry?: Entry) {
      if (watchedEntries.has(filePath)) return
      filePath = Path.normalize(filePath)
      // Watch for the dirname instead of the full file path to catch file creation
      chokidar?.add(Path.dirname(filePath))
      watchedEntries.set(filePath, [{ ...parentEntry }, childEntry && { ...childEntry }])
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
