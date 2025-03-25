import assignReducer from './reducers/assign.ts'
import type { Entry, Loader, Mapper, Reducer, Source, Transformer, Validator } from './types.ts'
import { toFilteredArray } from './utils.ts'
import { wrapLoader, wrapMapper, wrapReducer, wrapTransformer, wrapValidator } from './wrappers.ts'

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
  const entries = toFilteredArray(options.sources).flatMap((source) => {
    return typeof source === 'function' ? source(options) : source
  })
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

  const loadEntriesSync = (entries: Entry[]): Entry[] => {
    return entries.flatMap((entry) => {
      if (entry.loaded) return entry
      const loader = loaders.find((l) => l.canLoadSync(entry, options))
      if (!loader) throw new Error(`No loader found that can load entry ${entry.id}`)
      const returnedEntries = loader.loadSync(entry, options)

      const { loaded, unloaded } = returnedEntries.reduce(
        (result, returnedEntry) => {
          if (!returnedEntry.loaded && returnedEntry.id === entry.id) {
            throw new Error(
              `Loader ${loader.name} claimed that it can load entry ${entry.id}, but returned it unloaded`,
            )
          }
          if (returnedEntry.loaded) {
            result.loaded.push(returnedEntry)
          } else {
            result.unloaded.push(returnedEntry)
          }
          return result
        },
        { loaded: [], unloaded: [] } as { loaded: Entry[]; unloaded: Entry[] },
      )

      if (unloaded.length) {
        return [...loaded, ...loadEntriesSync(unloaded)]
      } else {
        return loaded
      }
    })
  }

  const loadAndMapEntriesSync = (entries: Entry[]): Entry[] => {
    return loadEntriesSync(entries).flatMap((entry) => {
      const { sameEntry, newEntries } = mappers.reduce(
        (result, mapper) => {
          const returnedEntries = mapper.mapSync(entry, options)
          returnedEntries.forEach((returnedEntry) => {
            if (returnedEntry.id === entry.id) {
              result.sameEntry = returnedEntry
            } else {
              result.newEntries.push(returnedEntry)
            }
          })
          return result
        },
        { sameEntry: entry, newEntries: [] } as { sameEntry: Entry; newEntries: Entry[] },
      )
      return [sameEntry, ...loadAndMapEntriesSync(newEntries)]
    })
  }

  return {
    get() {
      if (!config) {
        const processedEntries = loadAndMapEntriesSync(entries)
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
      return config
    },
    add(items: Source | Source[] | Entry | Entry[]) {
      const itemsArray = Array.isArray(items) ? items.flat() : [items]
      const newEntries = itemsArray.flatMap((item) => {
        return typeof item === 'function' ? item(options) : item
      })
      entries.push(...newEntries)
      return this
    },
  }
}

export default dozen
