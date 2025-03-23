import type {
  Entry,
  Loader,
  Mapper,
  Reducer,
  Source,
  SourceFactory,
  Transformer,
  Validator,
} from './types.ts'
import { isObject } from './utils.ts'
import {
  type WrappedSource,
  wrapLoader,
  wrapMapper,
  wrapReducer,
  wrapSource,
  wrapTransformer,
  wrapValidator,
} from './wrappers.ts'

const assignReducer: Reducer = {
  name: 'assignReducer',
  reduceSync: (config, entry) => Object.assign(config, entry.value),
}

interface DozenOptions {
  sources: (SourceFactory | undefined | false | null)[]
  loaders?: (Loader | undefined | false | null)[]
  mappers?: Mapper[]
  reducer?: Reducer
  transformers?: Transformer[]
  validators?: Validator[]
}

function dozen(name: string, options: DozenOptions) {
  const sources = options.sources
    .filter((sf) => typeof sf === 'function')
    .map((sourceFactory) => wrapSource(sourceFactory({ name })))
  const loaders = (options.loaders ?? []).filter(isObject).map((loader) => wrapLoader(loader))
  const mappers = (options.mappers ?? []).filter(isObject).map((mapper) => wrapMapper(mapper))
  const reducer = wrapReducer(options.reducer ?? assignReducer)
  const transformers = (options.transformers ?? [])
    .filter(isObject)
    .map((transformer) => wrapTransformer(transformer))
  const validators = (options.validators ?? [])
    .filter(isObject)
    .map((validator) => wrapValidator(validator))

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
        .readSync()
        .flatMap((entry) => {
          const loader = loaders.find((l) => l.canLoadSync(entry))
          return loader ? loader.loadSync(entry) : [entry]
        })
        .reduce((entriesById, entry) => {
          entry = mappers.reduce((entry, mapper) => {
            return mapper.mapSync(entry)
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
          return reducer.reduceSync(config, entry)
        }, Object.create(null))
        config = transformers.reduce((config, transformer) => {
          return transformer.transformSync(config!)
        }, config)
        validators.forEach((validator) => {
          validator.validateSync(config!)
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
