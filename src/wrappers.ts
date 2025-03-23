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

interface WrappedLoader<TOptions extends object> {
  canLoadSync: (entry: Entry, options: TOptions) => boolean
  canLoadAsync: (entry: Entry, options: TOptions) => boolean
  loadSync: (entry: Entry, options: TOptions) => Entry[]
  loadAsync: (entry: Entry, options: TOptions) => Promise<Entry[]>
}

function wrapLoader<TOptions extends object>(loader: Loader<TOptions>): WrappedLoader<TOptions> {
  return {
    canLoadSync: loader.canLoadSync ?? (() => false),
    loadSync: loader.loadSync
      ? (entry, options) => {
          const result = loader.loadSync(entry, options)
          return Array.isArray(result) ? result.filter(isObject) : result ? [result] : []
        }
      : () => {
          throw new Error(
            `Loader ${loader.name} doesn't support sync loads. Call loadAsync instead`,
          )
        },
    canLoadAsync: loader.canLoadAsync ?? (() => false),
    loadAsync: loader.loadAsync
      ? async (entry, options) => {
          const result = await loader.loadAsync(entry, options)
          return Array.isArray(result) ? result.filter(isObject) : result ? [result] : []
        }
      : async () => {
          throw new Error(
            `Loader ${loader.name} doesn't support async loads. Call loadSync instead`,
          )
        },
  }
}

interface WrappedMapper<TOptions extends object> {
  mapSync: (entry: Entry, options: TOptions) => Entry
  mapAsync: (entry: Entry, options: TOptions) => Promise<Entry>
}

function wrapMapper<TOptions extends object>(mapper: Mapper<TOptions>): WrappedMapper<TOptions> {
  return {
    mapSync: mapper.mapSync
      ? (entry, options) => mapper.mapSync(entry, options)
      : () => {
          throw new Error(`Mapper ${mapper.name} doesn't support sync maps. Call mapAsync instead`)
        },
    mapAsync: mapper.mapAsync
      ? async (entry, options) => mapper.mapAsync(entry, options)
      : async (entry, options) => mapper.mapSync(entry, options),
  }
}

interface WrappedReducer<TOptions extends object> {
  reduceSync: (config: object, entry: Entry, options: TOptions) => object
  reduceAsync: (config: object, entry: Entry, options: TOptions) => Promise<object>
}

function wrapReducer<TOptions extends object>(
  reducer: Reducer<TOptions>,
): WrappedReducer<TOptions> {
  return {
    reduceSync: reducer.reduceSync
      ? (config, entry, options) => reducer.reduceSync(config, entry, options)
      : () => {
          throw new Error(
            `Reducer ${reducer.name} doesn't support sync reduces. Call reduceAsync instead`,
          )
        },
    reduceAsync: reducer.reduceAsync
      ? async (config, entry, options) => reducer.reduceAsync(config, entry, options)
      : async (config, entry, options) => reducer.reduceSync(config, entry, options),
  }
}

interface WrappedTransformer<TOptions extends object> {
  transformSync: (config: object, options: TOptions) => object
  transformAsync: (config: object, options: TOptions) => Promise<object>
}

function wrapTransformer<TOptions extends object>(
  transformer: Transformer<TOptions>,
): WrappedTransformer<TOptions> {
  return {
    transformSync: transformer.transformSync
      ? (config, options) => transformer.transformSync(config, options)
      : () => {
          throw new Error(
            `Transformer ${transformer.name} doesn't support sync transforms. Call transformAsync instead`,
          )
        },
    transformAsync: transformer.transformAsync
      ? async (config, options) => transformer.transformAsync(config, options)
      : async (config, options) => transformer.transformSync(config, options),
  }
}

interface WrappedValidator<TOptions extends object> {
  validateSync: (config: object, options: TOptions) => void
  validateAsync: (config: object, options: TOptions) => Promise<void>
}

function wrapValidator<TOptions extends object>(
  validator: Validator<TOptions>,
): WrappedValidator<TOptions> {
  return {
    validateSync: validator.validateSync
      ? (config, options) => validator.validateSync(config, options)
      : () => {
          throw new Error(
            `Validator ${validator.name} doesn't support sync validations. Call validateAsync instead`,
          )
        },
    validateAsync: validator.validateAsync
      ? async (config, options) => validator.validateAsync(config, options)
      : async (config, options) => validator.validateSync(config, options),
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
