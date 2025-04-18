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
  const format = []

  if (path === '.env' || path.startsWith('.env.')) {
    format.push('env')
  } else {
    const extension = Path.extname(path).slice(1)
    extension && format.push(extension)
  }

  const basename = Path.basename(path)

  if (['package.json', 'tsconfig.json'].includes(basename)) {
    format.push(basename)
  }

  return format
}

interface FileLoaderOptions {
  cwd?: string
}

const fileLoader: PluginFactory<FileLoaderOptions> = () => {
  const watcher = createFileWatcher()

  return {
    name: 'default:fileLoader',

    load: async (entry, options) => {
      if (!canLoadEntry(entry)) return

      const cwd = options.cwd || process.cwd()
      const paths = (Array.isArray(entry.value) ? entry.value : [entry.value]) as string[]

      // We need to load the first file that exists. Reading them one by one is too slow,
      // so we stat them all in parallel and then read the first one that exists.
      const promises = paths.map(async (path) => {
        const pathFormat = getFormatFromPath(path)
        const formatArray = [...(entry.format || []), ...pathFormat].filter(
          (f) => f !== 'file' && f,
        )
        const format = [...new Set(formatArray)]
        const absolutePath = Path.resolve(cwd, path)
        const meta = { ...entry.meta, filePath: absolutePath }

        const entryToEmitOnWatch = {
          id: `file:${path}`,
          value: path,
          format: ['file', ...format],
          meta,
        }
        watcher.add(path, entry, entryToEmitOnWatch)

        try {
          const stats = await fsp.stat(absolutePath)
          if (stats.isFile()) {
            return {
              id: `file:loaded:${path}`,
              format,
              meta,
            }
          }
        } catch (e) {}
      })

      const results = await Promise.all(promises)
      const loadedEntry = results.find(Boolean)

      if (loadedEntry) {
        const value = await fsp.readFile(loadedEntry.meta.filePath, 'utf8')
        ;(loadedEntry as Entry).value = value
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
