import type { Entry, Loader, Mapper, Reducer, Source, Transformer, Validator } from './types.ts'
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
      : async (entry) => mapper.mapSync(entry),
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
      : async (config, entry) => reducer.reduceSync(config, entry),
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
      : async (config) => transformer.transformSync(config),
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
      : async (config) => validator.validateSync(config),
  }
}

export { wrapSource, wrapLoader, wrapMapper, wrapReducer, wrapTransformer, wrapValidator }
export type {
  WrappedSource,
  WrappedLoader,
  WrappedMapper,
  WrappedReducer,
  WrappedTransformer,
  WrappedValidator,
}
