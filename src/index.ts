import assignReducer from './reducers/assign.ts'
import type { Entry, Loader, Mapper, Reducer, Source, Transformer, Validator } from './types.ts'
import { toFilteredArray } from './utils.ts'
import {
  type WrappedSource,
  wrapLoader,
  wrapMapper,
  wrapReducer,
  wrapSource,
  wrapTransformer,
  wrapValidator,
} from './wrappers.ts'

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
  TSources extends (Source | undefined | null | false)[],
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
} & UnionToIntersection<ExtractOptions<TLoaders[number]>> &
  UnionToIntersection<ExtractOptions<TMappers[number]>> &
  ExtractOptions<TReducer> &
  UnionToIntersection<ExtractOptions<Transformers[number]>> &
  UnionToIntersection<ExtractOptions<TValidators[number]>>

function dozen<
  TSources extends (Source | undefined | null | false)[],
  TLoaders extends (Loader | undefined | null | false)[],
  TMappers extends (Mapper | undefined | null | false)[],
  TReducer extends Reducer | undefined | null | false,
  TTransformers extends (Transformer | undefined | null | false)[],
  TValidators extends (Validator<any> | undefined | null | false)[],
>(options: DozenOptions<TSources, TLoaders, TMappers, TReducer, TTransformers, TValidators>) {
  const sources = toFilteredArray(options.sources).map((source) => wrapSource(source))
  const loaders = toFilteredArray(options.loaders).map((loader) => wrapLoader(loader))
  const mappers = toFilteredArray(options.mappers).map((mapper) => wrapMapper(mapper))
  const reducer = wrapReducer(options.reducer || assignReducer)
  const transformers = toFilteredArray(options.transformers).map((transformer) =>
    wrapTransformer(transformer),
  )
  const validators = toFilteredArray(options.validators).map((validator) =>
    wrapValidator(validator),
  )

  const entriesBySource = new Map<WrappedSource, Map<string, Entry[]>>()
  let sourcesToRead = sources
  let config: object | undefined

  const addWrappedSource = (wrappedSource: WrappedSource) => {
    entriesBySource.set(wrappedSource, new Map<string, Entry[]>())
    sources.push(wrappedSource)
    sourcesToRead.push(wrappedSource)
  }

  sources.forEach(addWrappedSource)

  const readSourcesSync = () => {
    sourcesToRead.forEach((source) => {
      const entriesById = source
        .readSync(options)
        .flatMap((entry) => {
          const loader = loaders.find((l) => l.canLoadSync(entry, options))
          return loader ? loader.loadSync(entry, options) : [entry]
        })
        .reduce((entriesById, entry) => {
          entry = mappers.reduce((entry, mapper) => {
            return mapper.mapSync(entry, options)
          }, entry as Entry)
          const entriesWithSameId = entriesById.get(entry.id) || []
          entriesById.set(entry.id, [...entriesWithSameId, entry])
          return entriesById
        }, new Map<string, Entry[]>())
      entriesBySource.set(source, entriesById)
    })
    sourcesToRead = []
  }

  return {
    get() {
      if (sourcesToRead.length) {
        readSourcesSync()
        const entries = entriesBySource
          .values()
          .flatMap((entriesById) => entriesById.values())
          .toArray()
          .flat()
          .filter((entry) => typeof entry.value === 'object' && entry.value !== null)
        config = entries.reduce((config, entry) => {
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
    add(source: Source) {
      const wrappedSource = wrapSource(source)
      addWrappedSource(wrappedSource)
      return this
    },
  }
}

export default dozen
