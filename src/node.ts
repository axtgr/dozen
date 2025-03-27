import dozen, { type DozenOptions, type ExtractOptions, type UnionToIntersection } from './index.ts'
import argvLoader, { type ArgvLoaderOptions } from './loaders/argv.ts'
import cosmiconfigLoader, { type CosmiconfigLoaderOptions } from './loaders/cosmiconfig.ts'
import dotenvLoader, { type DotenvLoaderOptions } from './loaders/dotenv.ts'
import coerceStrings, { type CoerceStringsMapperOptions } from './mappers/coerceStrings.ts'
import prefix, { type PrefixMapperOptions } from './mappers/prefix.ts'
import argv, { type ArgvSourceOptions } from './sources/argv.ts'
import configFile, { type ConfigFileSourceOptions } from './sources/configFile.ts'
import dotenv, { type DotenvSourceOptions } from './sources/dotenv.ts'
import env, { type EnvSourceOptions } from './sources/env.ts'
import keyCaseTransformer, { type KeyCaseTransformerOptions } from './transformers/keyCase.ts'
import parseSchemaTransformer, {
  type ParseSchemaTransformerOptions,
} from './transformers/parseSchema.ts'
import type { Entry, Loader, Mapper, Reducer, Source, Transformer, Validator } from './types.ts'
import standardSchema, { type StandardSchemaValidatorOptions } from './validators/standardSchema.ts'

function dozenForNode<
  TSources extends (Source<any> | Entry | Entry[] | undefined | null | false)[],
  TLoaders extends (Loader | undefined | null | false)[],
  TMappers extends (Mapper | undefined | null | false)[],
  TReducer extends Reducer | undefined | null | false,
  TTransformers extends (Transformer | undefined | null | false)[],
  TValidators extends (Validator<any> | undefined | null | false)[],
>(
  options?: (Omit<
    DozenOptions<
      [
        Source<ConfigFileSourceOptions>,
        Source<DotenvSourceOptions>,
        Source<EnvSourceOptions>,
        Source<ArgvSourceOptions>,
      ],
      [Loader<CosmiconfigLoaderOptions>, Loader<DotenvLoaderOptions>, Loader<ArgvLoaderOptions>],
      [Mapper<PrefixMapperOptions>, Mapper<CoerceStringsMapperOptions>],
      Reducer,
      [Transformer<KeyCaseTransformerOptions>, Transformer<ParseSchemaTransformerOptions>],
      [Validator<StandardSchemaValidatorOptions>]
    >,
    'sources' | 'loaders' | 'mappers' | 'reducers' | 'transformers' | 'validators'
  > &
    Partial<UnionToIntersection<ExtractOptions<TSources[number]>>>) &
    Partial<UnionToIntersection<ExtractOptions<TLoaders[number]>>> &
    Partial<UnionToIntersection<ExtractOptions<TMappers[number]>>> &
    Partial<ExtractOptions<TReducer>> &
    Partial<UnionToIntersection<ExtractOptions<TTransformers[number]>>> &
    Partial<UnionToIntersection<ExtractOptions<TValidators[number]>>> & {
      sources?: TSources
      loaders?: TLoaders
      mappers?: TMappers
      reducer?: TReducer
      transformers?: TTransformers
      validators?: TValidators
    },
) {
  const name = options?.name
  return dozen({
    sources: [configFile(), dotenv(), env(), argv()],
    loaders: [cosmiconfigLoader, dotenvLoader, argvLoader],
    mappers: [prefix, coerceStrings],
    transformers: [keyCaseTransformer, parseSchemaTransformer],
    validators: [standardSchema],
    prefix: name
      ? {
          byTag: {
            env: {
              filter: `${name.toUpperCase()}_`,
              remove: `${name.toUpperCase()}_`,
            },
          },
        }
      : undefined,
    keyCase: 'camel',
    coerceStrings: {
      byTag: {
        env: true,
        argv: true,
      },
    },
    ...options,
  } as any)
}

dozenForNode.configFile = configFile
dozenForNode.env = env
dozenForNode.dotenv = dotenv
dozenForNode.argv = argv

export default dozenForNode
