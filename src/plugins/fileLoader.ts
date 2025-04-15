import fsp from 'node:fs/promises'
import Path from 'node:path'
import { createFileWatcher } from '../fileWatcher.ts'
import type { Entry, PluginFactory } from '../types.ts'

function canLoadEntry(entry: Entry) {
  return (
    entry.format?.includes('file') &&
    (Array.isArray(entry.value) || typeof entry.value === 'string')
  )
}

type FileLoaderOptions = object

const fileLoader: PluginFactory<FileLoaderOptions> = () => {
  const watcher = createFileWatcher()

  return {
    name: 'default:fileLoader',

    load: async (entry) => {
      if (!canLoadEntry(entry)) return

      const paths = (Array.isArray(entry.value) ? entry.value : [entry.value]) as string[]
      let value: string | undefined
      let filePath: string | undefined

      for (const path of paths) {
        try {
          value = await fsp.readFile(path, 'utf8')
          filePath = path
          break
        } catch (e) {}
      }

      entry.value = {}

      if (!filePath) {
        // TODO: even if there is currently no file, it could be added later,
        // so we should watch the path
        return entry
      }

      const fileFormat =
        filePath === '.env' || filePath.startsWith('.env.')
          ? 'env'
          : Path.extname(filePath).slice(1)
      const format = entry
        .format!.filter((f) => f !== 'file' && f !== fileFormat)
        .concat(fileFormat)

      const loadedFileEntry = {
        id: `file:loaded:${filePath}`,
        meta: { ...entry.meta, filePath },
        format,
        value,
      }

      const entryToEmitOnWatch = {
        ...loadedFileEntry,
        id: `file:${filePath}`,
        format: format.concat('file'),
        value: filePath,
      }

      paths.forEach((filePath) => watcher.add(filePath, entry, entryToEmitOnWatch))

      return [entry, loadedFileEntry]
    },

    watch: async (cb) => {
      watcher.watch(cb)
    },

    unwatch: async (cb) => {
      await watcher.unwatch(cb)
    },
  }
}

export default fileLoader
export type { FileLoaderOptions }
