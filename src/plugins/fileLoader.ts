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

function getFormatFromPath(path: string) {
  return path === '.env' || path.startsWith('.env.') ? 'env' : Path.extname(path).slice(1)
}

type FileLoaderOptions = object

const fileLoader: PluginFactory<FileLoaderOptions> = () => {
  const watcher = createFileWatcher()

  return {
    name: 'default:fileLoader',

    load: async (entry) => {
      if (!canLoadEntry(entry)) return

      const paths = (Array.isArray(entry.value) ? entry.value : [entry.value]) as string[]
      let loadedEntry: Entry | undefined

      for (const path of paths) {
        const format = getFormatFromPath(path)
        const meta = { ...entry.meta, filePath: path }

        if (!loadedEntry) {
          try {
            const value = await fsp.readFile(path, 'utf8')
            loadedEntry = {
              id: `file:loaded:${path}`,
              format: [format],
              value,
              meta,
            }
          } catch (e) {}
        }

        const entryToEmitOnWatch = {
          id: `file:${path}`,
          format: ['file', format],
          value: path,
          meta,
        }
        watcher.add(path, entry, entryToEmitOnWatch)
      }

      entry.value = {}
      return [entry, loadedEntry]
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
