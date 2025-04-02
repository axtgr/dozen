import forkLoader from './plugins/forkLoader.ts'
import fork from './sources/fork.ts'
import rawSource from './sources/raw.ts'
import type { Entry, Plugin, PluginFactory, Source } from './types.ts'
import { toFilteredArray } from './utils.ts'
import wrapPlugin from './wrapPlugin.ts'

type ExtractOptions<T> = T extends Source<infer O>
  ? O
  : T extends PluginFactory<infer O>
    ? O
    : T extends Plugin<infer O>
      ? O
      : never

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never

type DozenOptions<
  TSources extends (Source | Entry | Entry[] | undefined | null | false)[],
  TPlugins extends (PluginFactory | Plugin | undefined | null | false)[],
> = {
  sources?: TSources
  plugins?: TPlugins
} & UnionToIntersection<ExtractOptions<TSources[number]>> &
  UnionToIntersection<ExtractOptions<TPlugins[number]>>

function dozen<
  TSources extends (Source | Entry | Entry[] | undefined | null | false)[],
  TPlugins extends (PluginFactory | Plugin | undefined | null | false)[],
>(options: DozenOptions<TSources, TPlugins>) {
  const plugins = toFilteredArray(options.plugins).map((pluginOrFactory) => {
    const plugin =
      typeof pluginOrFactory === 'function' ? pluginOrFactory(options) : pluginOrFactory
    return wrapPlugin(plugin)
  })

  const entries: Entry[] = []
  let config: object = {}
  let entriesUpdated = false
  let promise = Promise.resolve()

  const removeSubtree = (entryId: string, removeItself = true) => {
    if (removeItself) {
      const index = entries.findIndex((entry) => entry.id === entryId)
      if (index !== -1) {
        entries.splice(index, 1)
        entriesUpdated = true
      }
    }
    entries
      .filter((entry) => entry.parentId === entryId)
      .forEach((entry) => {
        removeSubtree(entry.parentId!, true)
      })
  }

  const spliceEntry = (entry: Entry, replaceSelf: boolean, putBeforeParent: boolean) => {
    const selfIndex = entries.findIndex((e) => e.id === entry.id)
    let parentIndex = entry.parentId ? entries.findIndex((e) => e.id === entry.parentId) : -1

    if (parentIndex === -1) {
      if (selfIndex === -1) {
        entries.push(entry)
      } else if (replaceSelf) {
        entries.splice(selfIndex, 1, entry)
      } else {
        entries.splice(selfIndex, 1)
        entries.push(entry)
      }
    } else {
      entries.splice(selfIndex, 1)
      parentIndex += selfIndex === -1 || selfIndex > parentIndex || !replaceSelf ? 0 : -1
      if (putBeforeParent) {
        entries.splice(parentIndex, 0, entry)
      } else {
        entries.splice(parentIndex + 1, 0, entry)
      }
    }

    // A pending entry means it's going to be loaded and mapped producing a new set
    // of child entries, so we remove the existing children.
    if (entry.status === 'pending') {
      removeSubtree(entry.id, false)
    }

    entriesUpdated = true
  }

  const loadEntries = async () => {
    let gotNewEntries = false

    const promises = entries.map(async (entry) => {
      if (entry.status !== 'pending') return entry
      entry.status = 'loading'

      const loadedEntry = await plugins.reduce(async (resultPromise, plugin) => {
        if (entry.status !== 'loading' || !plugin.load) return resultPromise
        const currentEntry = await resultPromise
        const returnedEntries = await plugin.load(currentEntry, options)
        let resultEntry = currentEntry
        returnedEntries.forEach((returnedEntry) => {
          if (returnedEntry.id === entry.id) {
            if (returnedEntry.status === 'loading') {
              returnedEntry.status = 'loaded'
            }
            spliceEntry(returnedEntry, true, false)
            resultEntry = returnedEntry
          } else {
            if (!returnedEntry.status) {
              returnedEntry.status = 'pending'
            }
            returnedEntry.parentId = entry.id
            spliceEntry(returnedEntry, true, entry.status !== 'loaded')
            gotNewEntries = true
          }
        })
        return resultEntry
      }, Promise.resolve(entry))

      if (loadedEntry.status !== 'loaded') {
        throw new Error(`Entry ${loadedEntry.id} could not be loaded by any plugin`)
      }
    })

    await Promise.all(promises)

    if (gotNewEntries) {
      await loadEntries()
    }
  }

  const mapEntries = async () => {
    let gotNewEntries = false

    const promises = entries.map(async (entry) => {
      if (entry.status !== 'loaded') return entry
      entry.status = 'mapping'

      const mappedEntry = await plugins.reduce(async (resultPromise, plugin) => {
        if (entry.status !== 'mapping' || !plugin.map) return resultPromise
        const resultEntry = await resultPromise
        const returnedEntries = await plugin.map(resultEntry, options)
        returnedEntries.forEach((returnedEntry) => {
          if (returnedEntry.id === entry.id) {
            spliceEntry(returnedEntry, true, false)
          } else {
            if (!returnedEntry.status) {
              returnedEntry.status = 'pending'
            }
            returnedEntry.parentId = entry.id
            spliceEntry(returnedEntry, true, entry.status !== 'loaded')
            gotNewEntries = true
          }
        })
        return resultEntry
      }, Promise.resolve(entry))

      if (mappedEntry.status === 'mapping') {
        mappedEntry.status = 'mapped'
      }
      spliceEntry(mappedEntry, true, false)
    })

    await Promise.all(promises)

    if (gotNewEntries) {
      await loadEntries()
    }
  }

  const processConfig = async () => {
    if (!entriesUpdated) return
    entriesUpdated = true

    let configPromise = Promise.resolve(Object.create(null))

    const reducer = plugins.find((p) => p.reduce)
    if (reducer) {
      configPromise = entries.reduce((configPromise, entry) => {
        if (entry.status !== 'mapped') {
          throw new Error(`Attempting to reduce unmapped entry ${entry.id}`)
        }
        return configPromise.then((config) => reducer.reduce!(config, entry, options))
      }, configPromise)
    }

    configPromise = plugins.reduce((configPromise, plugin) => {
      if (!plugin.transform) return configPromise
      return configPromise.then((config) => plugin.transform!(config!, options))
    }, configPromise)

    const _config = await configPromise

    await Promise.all(
      plugins.map((plugin) => {
        return plugin.validate?.(_config, options)
      }),
    )

    config = _config
  }

  const process = async () => {
    promise = promise
      .then(() => loadEntries())
      .then(() => mapEntries())
      .then(() => processConfig())
    await promise
  }

  const instance = {
    get() {
      return config
    },

    async load() {
      await process()
      return config
    },

    add(
      items:
        | Source
        | object
        | undefined
        | null
        | false
        | (Source | object | undefined | null | false)[],
    ) {
      toFilteredArray(items)
        .flatMap((item) => {
          return typeof item === 'function' ? (item as Source)(options) : rawSource(item)(options)
        })
        .forEach((entry) => {
          if (!entry.status) {
            entry.status = 'pending'
          }
          spliceEntry(entry, false, false)
        })
      return instance
    },

    fork(forkOptions?: DozenOptions<TSources, TPlugins>) {
      const mergedOptions = {
        ...options,
        sources: [fork(instance), ...(forkOptions?.sources || [])],
        plugins: [forkLoader, ...(options.plugins || []), ...(forkOptions?.plugins || [])],
      } as DozenOptions<TSources, TPlugins>
      return dozen(mergedOptions)
    },
  }

  instance.add(options.sources || [])

  return instance
}

type DozenInstance = ReturnType<typeof dozen>

export default dozen
export type { UnionToIntersection, ExtractOptions, DozenOptions, DozenInstance }
