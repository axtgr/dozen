import dozen, {
  type DozenOptions,
  type ExtractOptions,
  type UnionToIntersection,
} from '../index.ts'
import argvLoader, { type ArgvLoaderOptions } from '../plugins/argvLoader.ts'
import assignReducer, { type AssignReducerOptions } from '../plugins/assignReducer.ts'
import coerceStringsMapper, {
  type CoerceStringsMapperOptions,
} from '../plugins/coerceStringsMapper.ts'
import cosmiconfigLoader, { type CosmiconfigLoaderOptions } from '../plugins/cosmiconfigLoader.ts'
import dotenvLoader, { type DotenvLoaderOptions } from '../plugins/dotenvLoader.ts'
import keyCaseMapper, { type KeyCaseMapperOptions } from '../plugins/keyCaseMapper.ts'
import parseSchemaTransformer, {
  type ParseSchemaTransformerOptions,
} from '../plugins/parseSchemaTransformer.ts'
import prefixMapper, { type PrefixMapperOptions } from '../plugins/prefixMapper.ts'
import standardSchemaValidator, {
  type StandardSchemaValidatorOptions,
} from '../plugins/standardSchemaValidator.ts'
import argv from '../sources/argv.ts'
import configFile, { type ConfigFileSourceOptions } from '../sources/configFile.ts'
import dotenv, { type DotenvSourceOptions } from '../sources/dotenv.ts'
import env, { type EnvSourceOptions } from '../sources/env.ts'
import file from '../sources/file.ts'
import type { Entry, Plugin, PluginFactory, Source } from '../types.ts'

function dozenForNode<
  TSources extends (Source | Entry | Entry[] | undefined | null | false)[],
  TPlugins extends (PluginFactory | Plugin | undefined | null | false)[],
>(
  options?: Omit<
    DozenOptions<
      [Source<ConfigFileSourceOptions>, Source<DotenvSourceOptions>, Source<EnvSourceOptions>],
      [
        Plugin<CosmiconfigLoaderOptions>,
        Plugin<DotenvLoaderOptions>,
        Plugin<ArgvLoaderOptions>,
        Plugin<PrefixMapperOptions>,
        Plugin<CoerceStringsMapperOptions>,
        Plugin<KeyCaseMapperOptions>,
        Plugin<AssignReducerOptions>,
        Plugin<ParseSchemaTransformerOptions>,
        Plugin<StandardSchemaValidatorOptions>,
      ]
    >,
    'sources' | 'plugins'
  > &
    Partial<UnionToIntersection<ExtractOptions<TSources[number]>>> &
    Partial<UnionToIntersection<ExtractOptions<TPlugins[number]>>> & {
      sources?: TSources
      plugins?: TPlugins
    },
) {
  const name = options?.name
  const sources = [configFile(), dotenv(), env()]
  const plugins = [
    cosmiconfigLoader,
    dotenvLoader,
    argvLoader,
    prefixMapper,
    coerceStringsMapper,
    keyCaseMapper,
    assignReducer,
    parseSchemaTransformer,
    standardSchemaValidator,
  ]
  return dozen({
    sources,
    plugins,
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
  } as DozenOptions<typeof sources, typeof plugins>)
}

dozenForNode.configFile = configFile
dozenForNode.env = env
dozenForNode.dotenv = dotenv
dozenForNode.argv = argv
dozenForNode.file = file

export default dozenForNode
