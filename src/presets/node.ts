import dozen, {
  type DozenOptions,
  type ExtractOptions,
  type UnionToIntersection,
} from '../index.ts'
import argvLoaderPlugin, { type ArgvLoaderPluginOptions } from '../plugins/argvLoader.ts'
import assignReducerPlugin, { type AssignReducerPluginOptions } from '../plugins/assignReducer.ts'
import coerceStringsMapperPlugin, {
  type CoerceStringsMapperPluginOptions,
} from '../plugins/coerceStringsMapper.ts'
import cosmiconfigLoaderPlugin, {
  type CosmiconfigLoaderPluginOptions,
} from '../plugins/cosmiconfigLoader.ts'
import dotenvLoaderPlugin, { type DotenvLoaderPluginOptions } from '../plugins/dotenvLoader.ts'
import keyCaseTransformerPlugin, {
  type KeyCaseTransformerPluginOptions,
} from '../plugins/keyCaseTransformer.ts'
import parseSchemaTransformerPlugin, {
  type ParseSchemaTransformerPluginOptions,
} from '../plugins/parseSchemaTransformer.ts'
import prefixMapperPlugin, { type PrefixMapperPluginOptions } from '../plugins/prefixMapper.ts'
import standardSchemaValidatorPlugin, {
  type StandardSchemaValidatorPluginOptions,
} from '../plugins/standardSchemaValidator.ts'
import argv from '../sources/argv.ts'
import configFile, { type ConfigFileSourceOptions } from '../sources/configFile.ts'
import dotenv, { type DotenvSourceOptions } from '../sources/dotenv.ts'
import env, { type EnvSourceOptions } from '../sources/env.ts'
import type { Entry, Plugin, Source } from '../types.ts'

function dozenForNode<
  TSources extends (Source | Entry | Entry[] | undefined | null | false)[],
  TPlugins extends (Plugin | Entry | Entry[] | undefined | null | false)[],
>(
  options?: Omit<
    DozenOptions<
      [Source<ConfigFileSourceOptions>, Source<DotenvSourceOptions>, Source<EnvSourceOptions>],
      [
        Plugin<CosmiconfigLoaderPluginOptions>,
        Plugin<DotenvLoaderPluginOptions>,
        Plugin<ArgvLoaderPluginOptions>,
        Plugin<PrefixMapperPluginOptions>,
        Plugin<CoerceStringsMapperPluginOptions>,
        Plugin<AssignReducerPluginOptions>,
        Plugin<KeyCaseTransformerPluginOptions>,
        Plugin<ParseSchemaTransformerPluginOptions>,
        Plugin<StandardSchemaValidatorPluginOptions>,
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
  return dozen({
    sources: [configFile(), dotenv(), env()],
    plugins: [
      cosmiconfigLoaderPlugin,
      dotenvLoaderPlugin,
      argvLoaderPlugin,
      prefixMapperPlugin,
      coerceStringsMapperPlugin,
      assignReducerPlugin,
      keyCaseTransformerPlugin,
      parseSchemaTransformerPlugin,
      standardSchemaValidatorPlugin,
    ],
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
