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

      if (!filePath) {
        entry.value = undefined
        return entry
      }

      const fileFormat =
        filePath === '.env' || filePath.startsWith('.env.')
          ? 'env'
          : Path.extname(filePath).slice(1)
      const format = entry.format!.concat(fileFormat)

      if (paths.length === 1) {
        watcher.add(filePath, { ...entry, value: filePath })
        entry.value = value || {}
        entry.format = format
        entry.meta ??= {}
        entry.meta.filePath = filePath
        return entry
      }

      const loadedFileEntry = {
        id: filePath,
        parentId: entry.id,
        status: 'loaded',
        meta: { ...entry.meta, filePath },
        format,
        value,
      } satisfies Entry

      entry.status = 'loaded'
      entry.value = {}

      const entryToEmitOnWatch = {
        ...loadedFileEntry,
        format,
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
