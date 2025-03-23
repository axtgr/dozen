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

interface WrappedSource {
  readSync: () => Entry[]
  readAsync: () => Promise<Entry[]>
}

function wrapSource(source: Source): WrappedSource {
  return {
    readSync: source.readSync
      ? () => {
          const result = source.readSync()
          return Array.isArray(result) ? result.filter(isObject) : result ? [result] : []
        }
      : () => {
          throw new Error(
            `Source ${source.name} doesn't support sync reads. Call readAsync instead or remove the source`,
          )
        },
    readAsync: source.readAsync
      ? async () => {
          const result = await source.readAsync()
          return Array.isArray(result) ? result.filter(isObject) : result ? [result] : []
        }
      : async () => source.readSync(),
  }
}

interface WrappedLoader {
  canLoadSync: (entry: Entry) => boolean
  canLoadAsync: (entry: Entry) => boolean
  loadSync: (entry: Entry) => Entry[]
  loadAsync: (entry: Entry) => Promise<Entry[]>
}

function wrapLoader(loader: Loader): WrappedLoader {
  return {
    canLoadSync: loader.canLoadSync ?? (() => false),
    loadSync: loader.loadSync
      ? (entry) => {
          const result = loader.loadSync(entry)
          return Array.isArray(result) ? result.filter(isObject) : result ? [result] : []
        }
      : () => {
          throw new Error(
            `Loader ${loader.name} doesn't support sync loads. Call loadAsync instead`,
          )
        },
    canLoadAsync: loader.canLoadAsync ?? (() => false),
    loadAsync: loader.loadAsync
      ? async (entry) => {
          const result = await loader.loadAsync(entry)
          return Array.isArray(result) ? result.filter(isObject) : result ? [result] : []
        }
      : async () => {
          throw new Error(
            `Loader ${loader.name} doesn't support async loads. Call loadSync instead`,
          )
        },
  }
}

interface WrappedMapper {
  mapSync: (entry: Entry) => Entry
  mapAsync: (entry: Entry) => Promise<Entry>
}

function wrapMapper(mapper: Mapper): WrappedMapper {
  return {
    mapSync: mapper.mapSync
      ? (entry) => mapper.mapSync(entry)
      : () => {
          throw new Error(`Mapper ${mapper.name} doesn't support sync maps. Call mapAsync instead`)
        },
    mapAsync: mapper.mapAsync
      ? async (entry) => mapper.mapAsync(entry)
      : async () => {
          throw new Error(`Mapper ${mapper.name} doesn't support async maps. Call mapSync instead`)
        },
  }
}

interface WrappedReducer {
  reduceSync: (config: object, entry: Entry) => object
  reduceAsync: (config: object, entry: Entry) => Promise<object>
}

function wrapReducer(reducer: Reducer): WrappedReducer {
  return {
    reduceSync: reducer.reduceSync
      ? (config, entry) => reducer.reduceSync(config, entry)
      : () => {
          throw new Error(
            `Reducer ${reducer.name} doesn't support sync reduces. Call reduceAsync instead`,
          )
        },
    reduceAsync: reducer.reduceAsync
      ? async (config, entry) => reducer.reduceAsync(config, entry)
      : async () => {
          throw new Error(
            `Reducer ${reducer.name} doesn't support async reduces. Call reduceSync instead`,
          )
        },
  }
}

interface WrappedTransformer {
  transformSync: (config: object) => object
  transformAsync: (config: object) => Promise<object>
}

function wrapTransformer(transformer: Transformer): WrappedTransformer {
  return {
    transformSync: transformer.transformSync
      ? (config) => transformer.transformSync(config)
      : () => {
          throw new Error(
            `Transformer ${transformer.name} doesn't support sync transforms. Call transformAsync instead`,
          )
        },
    transformAsync: transformer.transformAsync
      ? async (config) => transformer.transformAsync(config)
      : async () => {
          throw new Error(
            `Transformer ${transformer.name} doesn't support async transforms. Call transformSync instead`,
          )
        },
  }
}

interface WrappedValidator {
  validateSync: (config: object) => void
  validateAsync: (config: object) => Promise<void>
}

function wrapValidator(validator: Validator): WrappedValidator {
  return {
    validateSync: validator.validateSync
      ? (config) => validator.validateSync(config)
      : () => {
          throw new Error(
            `Validator ${validator.name} doesn't support sync validations. Call validateAsync instead`,
          )
        },
    validateAsync: validator.validateAsync
      ? async (config) => validator.validateAsync(config)
      : async () => {
          throw new Error(
            `Validator ${validator.name} doesn't support async validations. Call validateSync instead`,
          )
        },
  }
}

interface DozenOptions {
  sources: (SourceFactory | undefined | false | null)[]
  loaders: (Loader | undefined | false | null)[]
  mappers: Mapper[]
  reducer: Reducer
  transformers: Transformer[]
  validators: Validator[]
}

function dozen(name: string, options: DozenOptions) {
  const sources = options.sources
    .filter((sf) => typeof sf === 'function')
    .map((sourceFactory) => wrapSource(sourceFactory({ name })))
  const loaders = options.loaders.filter(isObject).map((loader) => wrapLoader(loader))
  const mappers = options.mappers.filter(isObject).map((mapper) => wrapMapper(mapper))
  const reducer = wrapReducer(options.reducer)
  const transformers = options.transformers
    .filter(isObject)
    .map((transformer) => wrapTransformer(transformer))
  const validators = options.validators
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
