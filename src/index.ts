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

  const ensureAllEntriesAreProcessedSync = () => {
    if (!unprocessedEntries.length) return false
    const entriesToProcess = unprocessedEntries
    unprocessedEntries = []
    const newEntries = processEntriesSync(entriesToProcess)
    processedEntries.push(...newEntries)
    ensureAllEntriesAreProcessedSync()
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

  return {
    get() {
      ensureConfigIsReadySync()
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
