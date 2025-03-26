import cosmiconfig from '../src/loaders/cosmiconfig.ts'
import dotenv from '../src/loaders/dotenv.ts'
import removePrefix from '../src/mappers/removePrefix.ts'
import configFile from '../src/sources/configFile.ts'
import dotenvSource from '../src/sources/dotenv.ts'
import env from '../src/sources/env.ts'
import standardSchema from '../src/validators/standardSchema.ts'
import dozen, { type DozenOptions } from './index.ts'
import type { Entry, Loader, Mapper, Reducer, Source, Transformer, Validator } from './types.ts'

function dozenForNode<
  TSources extends (Source | Entry | Entry[] | undefined | null | false)[],
  TLoaders extends (Loader | undefined | null | false)[],
  TMappers extends (Mapper | undefined | null | false)[],
  TReducer extends Reducer | undefined | null | false,
  TTransformers extends (Transformer | undefined | null | false)[],
  TValidators extends (Validator<any> | undefined | null | false)[],
>(options: DozenOptions<TSources, TLoaders, TMappers, TReducer, TTransformers, TValidators>) {
  return dozen({
    sources: [configFile(), dotenvSource(), env()],
    loaders: [cosmiconfig, dotenv],
    mappers: [removePrefix],
    transformers: [],
    validators: [standardSchema],
    removePrefix: ['env'],
    ...options,
  })
}

export default dozenForNode
