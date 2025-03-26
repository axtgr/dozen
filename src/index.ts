import assignReducer from './reducers/assign.ts'
import type { Entry, Loader, Mapper, Reducer, Source, Transformer, Validator } from './types.ts'
import { toFilteredArray } from './utils.ts'
import { wrapLoader, wrapMapper, wrapReducer, wrapTransformer, wrapValidator } from './wrappers.ts'

function sourcesToEntries<TOptions extends object>(
  sources:
    | Source
    | Entry
    | Entry[]
    | undefined
    | null
    | false
    | (Source | Entry | Entry[] | undefined | null | false)[],
  options: TOptions,
) {
  return toFilteredArray(sources).flatMap((source) => {
    return typeof source === 'function' ? source(options) : source
  })
}

type ExtractOptions<T> = T extends Source<infer O>
  ? O
  : T extends Loader<infer O>
    ? O
    : T extends Mapper<infer O>
      ? O
      : T extends Reducer<infer O>
        ? O
        : T extends Transformer<infer O>
          ? O
          : T extends Validator<infer O>
            ? O
            : never

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never

type DozenOptions<
  TSources extends (Source | Entry | Entry[] | undefined | null | false)[],
  TLoaders extends (Loader | undefined | null | false)[],
  TMappers extends (Mapper | undefined | null | false)[],
  TReducer extends Reducer | undefined | null | false,
  Transformers extends (Transformer | undefined | null | false)[],
  TValidators extends (Validator | undefined | null | false)[],
> = {
  sources?: TSources
  loaders?: TLoaders
  mappers?: TMappers
  reducer?: TReducer
  transformers?: Transformers
  validators?: TValidators
} & UnionToIntersection<ExtractOptions<TSources[number]>> &
  UnionToIntersection<ExtractOptions<TLoaders[number]>> &
  UnionToIntersection<ExtractOptions<TMappers[number]>> &
  ExtractOptions<TReducer> &
  UnionToIntersection<ExtractOptions<Transformers[number]>> &
  UnionToIntersection<ExtractOptions<TValidators[number]>>

function dozen<
  TSources extends (Source | Entry | Entry[] | undefined | null | false)[],
  TLoaders extends (Loader | undefined | null | false)[],
  TMappers extends (Mapper | undefined | null | false)[],
  TReducer extends Reducer | undefined | null | false,
  TTransformers extends (Transformer | undefined | null | false)[],
  TValidators extends (Validator<any> | undefined | null | false)[],
>(options: DozenOptions<TSources, TLoaders, TMappers, TReducer, TTransformers, TValidators>) {
  const loaders = toFilteredArray(options.loaders).map((loader) => wrapLoader(loader))
  const mappers = toFilteredArray(options.mappers).map((mapper) => wrapMapper(mapper))
  const reducer = wrapReducer(options.reducer || assignReducer)
  const transformers = toFilteredArray(options.transformers).map((transformer) =>
    wrapTransformer(transformer),
  )
  const validators = toFilteredArray(options.validators).map((validator) =>
    wrapValidator(validator),
  )

  let config: object | undefined
  let unprocessedEntries: Entry[] = sourcesToEntries(options.sources, options)
  const processedEntries: Entry[] = []
  let processingPromise = Promise.resolve()

  const loadEntriesSync = (entries: Entry[]): Entry[] => {
    return entries.flatMap((entry) => {
      if (entry.loaded) return entry
      const loader = loaders.find((l) => l.canLoadSync(entry, options))
      if (!loader) throw new Error(`No loader found that can load entry ${entry.id}`)
      const returnedEntries = loader.loadSync(entry, options)

      const allLoaded = returnedEntries.every((returnedEntry) => {
        if (!returnedEntry.loaded && returnedEntry.id === entry.id) {
          throw new Error(
            `Loader ${loader.name} claimed that it can load entry ${entry.id}, but returned it unloaded`,
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

      const canLoadersLoadPromises = loaders.map((l) => l.canLoadAsync(entry, options))
      const canLoadersLoad = await Promise.all(canLoadersLoadPromises)
      const loaderIndex = canLoadersLoad.findIndex(Boolean)
      const loader = loaderIndex > -1 ? loaders[loaderIndex] : undefined
      if (!loader) throw new Error(`No loader found that can load entry ${entry.id}`)

      const returnedEntries = await loader.loadAsync(entry, options)

      const allLoaded = returnedEntries.every((returnedEntry) => {
        if (!returnedEntry.loaded && returnedEntry.id === entry.id) {
          throw new Error(
            `Loader ${loader.name} claimed that it can load entry ${entry.id}, but returned it unloaded`,
          )
        }
        return returnedEntry.loaded
      })

      return allLoaded ? returnedEntries : loadEntriesAsync(returnedEntries)
    })
    const loadedEntries = await Promise.all(promises)
    return loadedEntries.flat()
  }

  const processEntriesSync = (entries: Entry[], processedIds: string[] = []): Entry[] => {
    return loadEntriesSync(entries).flatMap((entry) => {
      if (processedIds.includes(entry.id)) return []
      const result = mappers.reduce(
        (result, mapper) => {
          const returnedEntries = mapper.mapSync(entry, options)
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

  const processEntriesAsync = async (
    entries: Entry[],
    processedIds: string[] = [],
  ): Promise<Entry[]> => {
    const loadedEntries = await loadEntriesAsync(entries)
    const promises = loadedEntries.map(async (entry) => {
      if (processedIds.includes(entry.id)) return []
      const result = await mappers.reduce(
        async (resultPromise, mapper) => {
          const result = await resultPromise
          const returnedEntries = await mapper.mapAsync(entry, options)
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
      config = processedEntries.reduce((config, entry) => {
        return reducer.reduceSync(config, entry, options)
      }, Object.create(null))
      config = transformers.reduce((config, transformer) => {
        return transformer.transformSync(config!, options)
      }, config)
      validators.forEach((validator) => {
        validator.validateSync(config!, options)
      })
    }
  }

  const ensureConfigIsReadyAsync = async () => {
    if (await ensureAllEntriesAreProcessedAsync()) {
      let configPromise = processedEntries.reduce(
        (configPromise, entry) => {
          return configPromise.then((config) => reducer.reduceAsync(config, entry, options))
        },
        Promise.resolve(Object.create(null)),
      )
      configPromise = transformers.reduce((configPromise, transformer) => {
        return configPromise.then((config) => transformer.transformAsync(config!, options))
      }, configPromise)
      const _config = await configPromise
      await Promise.all(
        validators.map((validator) => {
          return validator.validateAsync(_config, options)
        }),
      )
      config = _config
    }
  }

  return {
    get() {
      ensureConfigIsReadySync()
      return config
    },

    async getAsync() {
      processingPromise = processingPromise.then(() => ensureConfigIsReadyAsync())
      await processingPromise
      return config
    },

    add(items: Source | Source[] | Entry | Entry[]) {
      const newEntries = sourcesToEntries(items, options)
      unprocessedEntries.push(...newEntries)
      return this
    },
  }
}

export default dozen
export type { DozenOptions }
