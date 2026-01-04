import Path from 'node:path'
import Url from 'node:url'
import { createFileWatcher } from '../fileWatcher.ts'
import type { Entry, PluginFactory } from '../types.ts'

const importPath = async (path: string) => {
  const url = Url.pathToFileURL(path)
  url.searchParams.set('cacheBust', String(Date.now()))
  const exported = await import(url.href)
  return exported.default
}

const importers: Record<string, (path: string) => unknown> = {
  js: importPath,
  mjs: importPath,
  cjs: importPath,
  ts: importPath,
  mts: importPath,
  cts: importPath,
}

function canLoadEntry(entry: Entry) {
  return (
    entry.format?.includes('file') &&
    (Array.isArray(entry.value) || typeof entry.value === 'string')
  )
}

interface JsLoaderOptions {
  cwd?: string
}

const jsLoader: PluginFactory<JsLoaderOptions> = () => {
  const watcher = createFileWatcher()

  return {
    name: 'default:jsLoader',

    load: async (entry, options) => {
      if (!canLoadEntry(entry)) return

      const cwd = options.cwd || process.cwd()
      const paths = (Array.isArray(entry.value) ? entry.value : [entry.value]) as string[]
      let loadedEntry: Entry | undefined
      const unhandledPaths: string[] = []

      for (const path of paths) {
        const extension = Path.extname(path).slice(1).toLowerCase()
        const importer = importers[extension]

        if (!importer) {
          unhandledPaths.push(path)
          continue
        }

        const absolutePath = Path.resolve(cwd, path)
        const meta = { ...entry.meta, filePath: absolutePath }

        if (!loadedEntry) {
          try {
            const value = await importer(absolutePath)
            loadedEntry = {
              id: `js:loaded:${path}`,
              format: [extension, 'object'],
              value,
              meta,
            }
          } catch (_e) {}
        }

        const emitId = `file:${path}`
        const entryToEmitOnWatch =
          entry.id === emitId
            ? undefined
            : {
                id: emitId,
                format: ['file', extension],
                value: path,
                meta,
              }
        watcher.add(path, entry, entryToEmitOnWatch)
      }

      if (unhandledPaths.length === paths.length) return

      entry.value = {}
      loadedEntry ??= {
        ...entry,
        id: `${entry.id}:filtered`,
        value: unhandledPaths,
      }

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

export default jsLoader
export type { JsLoaderOptions }
