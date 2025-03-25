import type { Entry, Loader, Mapper, Reducer, Transformer, Validator } from './types.ts'
import { toFilteredArray } from './utils.ts'

interface WrappedLoader<TOptions extends object> {
  name: string
  canLoadSync: (entry: Entry, options: TOptions) => boolean
  canLoadAsync: (entry: Entry, options: TOptions) => boolean
  loadSync: (entry: Entry, options: TOptions) => Entry[]
  loadAsync: (entry: Entry, options: TOptions) => Promise<Entry[]>
}

function wrapLoader<TOptions extends object>(loader: Loader<TOptions>): WrappedLoader<TOptions> {
  const wrappedLoader: WrappedLoader<TOptions> = {
    name: loader.name,
    canLoadSync: loader.canLoadSync ?? (() => false),
    loadSync: loader.loadSync
      ? (entry, options) => {
          const result = loader.loadSync(entry, options)
          return toFilteredArray(result)
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
          return toFilteredArray(result)
        }
      : async (entry, options) => wrappedLoader.loadSync(entry, options),
  }
  return wrappedLoader
}

interface WrappedMapper<TOptions extends object> {
  name: string
  mapSync: (entry: Entry, options: TOptions) => Entry[]
  mapAsync: (entry: Entry, options: TOptions) => Promise<Entry[]>
}

function wrapMapper<TOptions extends object>(mapper: Mapper<TOptions>): WrappedMapper<TOptions> {
  const wrappedMapper: WrappedMapper<TOptions> = {
    name: mapper.name,
    mapSync: mapper.mapSync
      ? (entry, options) => {
          const result = mapper.mapSync(entry, options)
          return toFilteredArray(result)
        }
      : () => {
          throw new Error(`Mapper ${mapper.name} doesn't support sync maps. Call mapAsync instead`)
        },
    mapAsync: mapper.mapAsync
      ? async (entry, options) => {
          const result = await mapper.mapAsync(entry, options)
          return toFilteredArray(result)
        }
      : async (entry, options) => wrappedMapper.mapSync(entry, options),
  }
  return wrappedMapper
}

interface WrappedReducer<TOptions extends object> {
  name: string
  reduceSync: (config: object, entry: Entry, options: TOptions) => object
  reduceAsync: (config: object, entry: Entry, options: TOptions) => Promise<object>
}

function wrapReducer<TOptions extends object>(
  reducer: Reducer<TOptions>,
): WrappedReducer<TOptions> {
  const wrappedReducer: WrappedReducer<TOptions> = {
    name: reducer.name,
    reduceSync: reducer.reduceSync
      ? (config, entry, options) => reducer.reduceSync(config, entry, options)
      : () => {
          throw new Error(
            `Reducer ${reducer.name} doesn't support sync reduces. Call reduceAsync instead`,
          )
        },
    reduceAsync: reducer.reduceAsync
      ? (config, entry, options) => reducer.reduceAsync(config, entry, options)
      : async (config, entry, options) => wrappedReducer.reduceSync(config, entry, options),
  }
  return wrappedReducer
}

interface WrappedTransformer<TOptions extends object> {
  name: string
  transformSync: (config: object, options: TOptions) => object
  transformAsync: (config: object, options: TOptions) => Promise<object>
}

function wrapTransformer<TOptions extends object>(
  transformer: Transformer<TOptions>,
): WrappedTransformer<TOptions> {
  const wrappedTransformer: WrappedTransformer<TOptions> = {
    name: transformer.name,
    transformSync: transformer.transformSync
      ? (config, options) => transformer.transformSync(config, options)
      : () => {
          throw new Error(
            `Transformer ${transformer.name} doesn't support sync transforms. Call transformAsync instead`,
          )
        },
    transformAsync: transformer.transformAsync
      ? (config, options) => transformer.transformAsync(config, options)
      : async (config, options) => wrappedTransformer.transformSync(config, options),
  }
  return wrappedTransformer
}

interface WrappedValidator<TOptions extends object> {
  name: string
  validateSync: (config: object, options: TOptions) => void
  validateAsync: (config: object, options: TOptions) => Promise<void>
}

function wrapValidator<TOptions extends object>(
  validator: Validator<TOptions>,
): WrappedValidator<TOptions> {
  const wrappedValidator: WrappedValidator<TOptions> = {
    name: validator.name,
    validateSync: validator.validateSync
      ? (config, options) => validator.validateSync(config, options)
      : () => {
          throw new Error(
            `Validator ${validator.name} doesn't support sync validations. Call validateAsync instead`,
          )
        },
    validateAsync: validator.validateAsync
      ? (config, options) => validator.validateAsync(config, options)
      : async (config, options) => wrappedValidator.validateSync(config, options),
  }
  return wrappedValidator
}

export { wrapLoader, wrapMapper, wrapReducer, wrapTransformer, wrapValidator }
export type { WrappedLoader, WrappedMapper, WrappedReducer, WrappedTransformer, WrappedValidator }
