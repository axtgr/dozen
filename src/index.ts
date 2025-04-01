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

  let config: object = {}
  let unprocessedEntries: Entry[] = toEntries(options.sources, options)
  const processedEntries: Entry[] = []
  let processingPromise = Promise.resolve()

  const loadEntries = async (entries: Entry[], idsBeingLoaded: Set<string>): Promise<Entry[]> => {
    const promises = entries.map(async (entry) => {
      if (idsBeingLoaded.has(entry.id)) return []
      idsBeingLoaded.add(entry.id)
      if (entry.loaded) return entry
      const result = await plugins.reduce(
        async (resultPromise, plugin) => {
          if (entry.loaded || !plugin.load) return resultPromise
          const result = await resultPromise
          const returnedEntries = await plugin.load(result.entry, options)
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
      return [
        ...(result.pre.length ? await loadEntries(result.pre, idsBeingLoaded) : []),
        result.entry,
        ...(result.post.length ? await loadEntries(result.post, idsBeingLoaded) : []),
      ]
    })
    const processedEntries = await Promise.all(promises)
    return processedEntries.flat()
  }

  const mapEntries = async (
    entries: Entry[],
    idsBeingLoaded: Set<string>,
    idsBeingProcessed: Set<string>,
  ) => {
    const promises = entries.map(async (entry) => {
      if (idsBeingProcessed.has(entry.id)) return []
      idsBeingProcessed.add(entry.id)
      const result = await plugins.reduce(
        async (resultPromise, plugin) => {
          if (!plugin.map) return resultPromise
          const result = await resultPromise
          const returnedEntries = await plugin.map(result.entry, options)
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
      return [
        ...(result.pre.length
          ? await processEntries(result.pre, idsBeingLoaded, idsBeingProcessed)
          : []),
        result.entry,
        ...(result.post.length
          ? await processEntries(result.post, idsBeingLoaded, idsBeingProcessed)
          : []),
      ]
    })
    const processedEntries = await Promise.all(promises)
    return processedEntries.flat()
  }

  const processEntries = async (
    entries: Entry[],
    idsBeingLoaded = new Set<string>(),
    idsBeingProcessed = new Set<string>(),
  ): Promise<Entry[]> => {
    const loadedEntries = await loadEntries(entries, idsBeingLoaded)
    const unloadedEntry = loadedEntries.find((entry) => !entry.loaded)
    if (unloadedEntry)
      throw new Error(`Entry ${unloadedEntry.id} could not be loaded by any loader`)
    return mapEntries(loadedEntries, idsBeingLoaded, idsBeingProcessed)
  }

  const ensureAllEntriesAreProcessed = async () => {
    if (!unprocessedEntries.length) return false
    const entriesToProcess = unprocessedEntries
    unprocessedEntries = []
    const newEntries = await processEntries(entriesToProcess)
    processedEntries.push(...newEntries)
    await ensureAllEntriesAreProcessed()
    return true
  }

  const ensureConfigIsReady = async () => {
    if (await ensureAllEntriesAreProcessed()) {
      let configPromise = Promise.resolve(Object.create(null))

      const reducer = plugins.find((p) => p.reduce)
      if (reducer) {
        configPromise = processedEntries.reduce((configPromise, entry) => {
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
  }

  const instance = {
    get() {
      return config
    },

    async load() {
      processingPromise = processingPromise.then(() => ensureConfigIsReady())
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
  return instance
}

type DozenInstance = ReturnType<typeof dozen>

export default dozen
export type { UnionToIntersection, ExtractOptions, DozenOptions, DozenInstance }
