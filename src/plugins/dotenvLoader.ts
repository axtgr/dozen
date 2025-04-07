import dotenv from 'dotenv'
import { createFileWatcher } from '../fileWatcher.ts'
import type { Entry, PluginFactory } from '../types.ts'

function canLoadEntry(entry: Entry) {
  return (
    entry.format?.includes('file') &&
    entry.format.includes('env') &&
    (Array.isArray(entry.value) || typeof entry.value === 'string')
  )
}

type DotenvLoaderOptions = object

const dotenvLoader: PluginFactory<DotenvLoaderOptions> = () => {
  const watcher = createFileWatcher()
  return {
    name: 'default:dotenvLoader',
    load: async (entry) => {
      if (!canLoadEntry(entry)) return
      const filePaths = entry.value as string | string[]
      const { error, parsed } = dotenv.config({
        path: filePaths,
        processEnv: {},
      })
      if (error && (error as any).code !== 'ENOENT') {
        throw error
      }
      const newEntry = { ...entry, format: [...(entry.format || [])] }
      newEntry.status = 'loaded'
      newEntry.value = parsed || {}
      newEntry.meta ??= {}
      newEntry.meta.filePaths = filePaths
      if (Array.isArray(filePaths)) {
        filePaths.forEach((filePath) => watcher.add(filePath, entry))
      } else {
        watcher.add(filePaths, entry)
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

export default dotenvLoader
export type { DotenvLoaderOptions }
