import forkLoader from './plugins/forkLoader.ts'
import fork from './sources/fork.ts'
import rawSource from './sources/raw.ts'
import type { Entry, Plugin, PluginFactory, Source } from './types.ts'
import { toFilteredArray } from './utils.ts'
import wrapPlugin from './wrapPlugin.ts'

function toEntries<TOptions extends object>(
  items:
    | Source
    | object
    | undefined
    | null
    | false
    | (Source | object | undefined | null | false)[],
  options: TOptions,
) {
  return toFilteredArray(items).flatMap((item) => {
    return typeof item === 'function' ? (item as Source)(options) : rawSource(item)(options)
  })
}

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

  let config: object | undefined
  let unprocessedEntries: Entry[] = toEntries(options.sources, options)
  const processedEntries: Entry[] = []
  let processingPromise = Promise.resolve()

  const loadEntriesSync = (entries: Entry[]): Entry[] => {
    return entries.flatMap((entry) => {
      if (entry.loaded) return entry
      const plugin = plugins.find((p) => p.canLoadSync(entry, options))
      if (!plugin) throw new Error(`No plugin found that can load entry ${entry.id} synchronously`)
      const returnedEntries = plugin.loadSync!(entry, options)
      const allLoaded = returnedEntries.every((returnedEntry) => {
        if (!returnedEntry.loaded && returnedEntry.id === entry.id) {
          throw new Error(
            `Plugin ${plugin.name} claimed that it can load entry ${entry.id}, but returned it unloaded`,
          )
        }
        return returnedEntry.loaded
      })
      return allLoaded ? returnedEntries : loadEntriesSync(returnedEntries)
    })
  }

  const loadEntriesAsync = async (entries: Entry[]): Promise<Entry[]> => {
    const promises = entries.map(async (entry) => {
      if (entry.loaded) return entry

      const canPluginsLoadPromises = plugins.map((p) => p.canLoadAsync(entry, options))
      const canPluginsLoad = await Promise.all(canPluginsLoadPromises)
      const pluginIndex = canPluginsLoad.findIndex(Boolean)
      const plugin = pluginIndex > -1 ? plugins[pluginIndex] : undefined
      if (!plugin) throw new Error(`No plugin found that can load entry ${entry.id} asynchronously`)

      const returnedEntries = await plugin.loadAsync!(entry, options)

      const allLoaded = returnedEntries.every((returnedEntry) => {
        // TODO: remove/revamp
        if (!returnedEntry.loaded && returnedEntry.id === entry.id) {
          throw new Error(
            `Plugin ${plugin.name} claimed that it can load entry ${entry.id}, but returned it unloaded`,
          )
        }
        return returnedEntry.loaded
      })

      return allLoaded ? returnedEntries : loadEntriesAsync(returnedEntries)
    })
    const loadedEntries = await Promise.all(promises)
    return loadedEntries.flat()
  }

  const mapEntriesSync = (entries: Entry[], processedIds: string[] = []): Entry[] => {
    return entries.flatMap((entry) => {
      if (processedIds.includes(entry.id)) return []
      const result = plugins.reduce(
        (result, plugin) => {
          if (!plugin.mapSync) return result
          const returnedEntries = plugin.mapSync(result.entry, options)
          let preOrPostArray = result.pre
          returnedEntries.forEach((returnedEntry) => {
            if (returnedEntry.id === entry.id) {
              result.entry = returnedEntry
              preOrPostArray = result.post
            } else {
              preOrPostArray.push(returnedEntry)
            }
          })
          return result
        },
        { pre: [], entry, post: [] } as { pre: Entry[]; entry: Entry; post: Entry[] },
      )
      processedIds.push(result.entry.id)
      return [
        ...(result.pre.length ? processEntriesSync(result.pre, processedIds) : []),
        result.entry,
        ...(result.post.length ? processEntriesSync(result.post, processedIds) : []),
      ]
    })
  }

  const mapEntriesAsync = async (entries: Entry[], processedIds: string[] = []) => {
    const promises = entries.map(async (entry) => {
      if (processedIds.includes(entry.id)) return []
      const result = await plugins.reduce(
        async (resultPromise, plugin) => {
          if (!plugin.mapAsync) return resultPromise
          const result = await resultPromise
          const returnedEntries = await plugin.mapAsync(result.entry, options)
          let preOrPostArray = result.pre
          returnedEntries.forEach((returnedEntry) => {
            if (returnedEntry.id === entry.id) {
              result.entry = returnedEntry
              preOrPostArray = result.post
            } else {
              preOrPostArray.push(returnedEntry)
            }
          })
          return result
        },
        Promise.resolve({ pre: [], entry, post: [] } as {
          pre: Entry[]
          entry: Entry
          post: Entry[]
        }),
      )
      processedIds.push(result.entry.id)
      return [
        ...(result.pre.length ? await processEntriesAsync(result.pre, processedIds) : []),
        result.entry,
        ...(result.post.length ? await processEntriesAsync(result.post, processedIds) : []),
      ]
    })
    const processedEntries = await Promise.all(promises)
    return processedEntries.flat()
  }

  const processEntriesSync = (entries: Entry[], processedIds: string[] = []): Entry[] => {
    const loadedEntries = loadEntriesSync(entries)
    return mapEntriesSync(loadedEntries, processedIds)
  }

  const processEntriesAsync = async (
    entries: Entry[],
    processedIds: string[] = [],
  ): Promise<Entry[]> => {
    const loadedEntries = await loadEntriesAsync(entries)
    return mapEntriesAsync(loadedEntries, processedIds)
  }

  const ensureAllEntriesAreProcessedSync = () => {
    if (!unprocessedEntries.length) return false
    const entriesToProcess = unprocessedEntries
    unprocessedEntries = []
    const newEntries = processEntriesSync(entriesToProcess)
    processedEntries.push(...newEntries)
    ensureAllEntriesAreProcessedSync()
    return true
  }

  const ensureAllEntriesAreProcessedAsync = async () => {
    if (!unprocessedEntries.length) return false
    const entriesToProcess = unprocessedEntries
    unprocessedEntries = []
    const newEntries = await processEntriesAsync(entriesToProcess)
    processedEntries.push(...newEntries)
    await ensureAllEntriesAreProcessedAsync()
    return true
  }

  const ensureConfigIsReadySync = () => {
    if (ensureAllEntriesAreProcessedSync()) {
      config = Object.create(null)

      const reducer = plugins.find((p) => p.reduceSync)
      if (reducer) {
        config = processedEntries.reduce((result, entry) => {
          return reducer?.reduceSync!(result, entry, options) || result
        }, config!)
      }

      config = plugins.reduce((result, plugin) => {
        return plugin.transformSync?.(result!, options) || result
      }, config)

      plugins.forEach((plugin) => {
        plugin.validateSync?.(config!, options)
      })
    }
  }

  const ensureConfigIsReadyAsync = async () => {
    if (await ensureAllEntriesAreProcessedAsync()) {
      let configPromise = Promise.resolve(Object.create(null))

      const reducer = plugins.find((p) => p.reduceAsync)
      if (reducer) {
        configPromise = processedEntries.reduce((configPromise, entry) => {
          return configPromise.then((config) => reducer.reduceAsync!(config, entry, options))
        }, configPromise)
      }

      configPromise = plugins.reduce((configPromise, plugin) => {
        if (!plugin.transformAsync) return configPromise
        return configPromise.then((config) => plugin.transformAsync!(config!, options))
      }, configPromise)

      const _config = await configPromise

      await Promise.all(
        plugins.map((plugin) => {
          return plugin.validateAsync?.(_config, options)
        }),
      )

      config = _config
    }
  }

  const instance = {
    get() {
      ensureConfigIsReadySync()
      return config
    },

    async getAsync() {
      processingPromise = processingPromise.then(() => ensureConfigIsReadyAsync())
      await processingPromise
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
      const newEntries = toEntries(items, options)
      unprocessedEntries.push(...newEntries)
      return this
    },

    fork(forkOptions: DozenOptions<TSources, TPlugins>) {
      const mergedOptions = {
        ...options,
        sources: [fork(instance), ...(forkOptions?.sources || [])],
        plugins: [forkLoader, ...(options.plugins || []), ...(forkOptions?.plugins || [])],
      } as DozenOptions<TSources, TPlugins>
      return dozen(mergedOptions)
    },
  }
  return instance
}

export default dozen
export type { UnionToIntersection, ExtractOptions, DozenOptions }
