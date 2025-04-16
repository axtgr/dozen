import type { StandardSchemaV1 } from '@standard-schema/spec'
import dozen, {
  type DozenInstance,
  type DozenOptions,
  type ExtractOptions,
  type UnionToIntersection,
} from '../index.ts'
import argvLoader, { type ArgvLoaderOptions } from '../plugins/argvLoader.ts'
import assignReducer, { type AssignReducerOptions } from '../plugins/assignReducer.ts'
import coerceStringsMapper, {
  type CoerceStringsMapperOptions,
} from '../plugins/coerceStringsMapper.ts'
import deepReducer from '../plugins/deepReducer.ts'
import envLoader, { type EnvLoaderOptions } from '../plugins/envLoader.ts'
import extendsMapper, { type ExtendsMapperOptions } from '../plugins/extendsMapper.ts'
import fileLoader, { type FileLoaderOptions } from '../plugins/fileLoader.ts'
import jsonLoader, { type JsonLoaderOptions } from '../plugins/jsonLoader.ts'
import keyCaseMapper, { type KeyCaseMapperOptions } from '../plugins/keyCaseMapper.ts'
import objectLoader, { type ObjectLoaderOptions } from '../plugins/objectLoader.ts'
import parseSchemaTransformer, {
  type ParseSchemaTransformerOptions,
} from '../plugins/parseSchemaTransformer.ts'
import pickPropertyMapper, {
  type PickPropertyMapperOptions,
} from '../plugins/pickPropertyMapper.ts'
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

/**
 * Creates a new instance of Dozen tuned for Node.js-compatible runtimes that loads
 * from the following sources:
 *
 * 1. The "myapp" field in package.json;
 * 2. myapp.config.json, myapprc.yaml, .myapprc and other config files with the given name;
 * 3. .env, .env.local, .env.${NODE_ENV}, .env.${NODE_ENV}.local files;
 * 4. Environment variables (process.env);
 * 5. CLI arguments (process.argv) (if the argv plugin is enabled).
 *
 * Then normalizes and validates the config object with the given schema (if provided).
 */
function dozenForNode<
  TSources extends (Source | Entry | Entry[] | undefined | null | false)[],
  TPlugins extends (PluginFactory | Plugin | undefined | null | false)[],
  TSchema extends StandardSchemaV1 | unknown = unknown,
>(
  options?: Omit<
    DozenOptions<
      [Source<ConfigFileSourceOptions>, Source<DotenvSourceOptions>, Source<EnvSourceOptions>],
      [
        Plugin<FileLoaderOptions>,
        Plugin<ArgvLoaderOptions>,
        Plugin<ObjectLoaderOptions>,
        Plugin<JsonLoaderOptions>,
        Plugin<EnvLoaderOptions>,
        Plugin<PrefixMapperOptions>,
        Plugin<CoerceStringsMapperOptions>,
        Plugin<KeyCaseMapperOptions>,
        Plugin<ExtendsMapperOptions>,
        Plugin<PickPropertyMapperOptions>,
        Plugin<AssignReducerOptions>,
        Plugin<ParseSchemaTransformerOptions>,
        Plugin<StandardSchemaValidatorOptions>,
      ],
      TSchema
    >,
    'sources' | 'plugins' | 'schema'
  > & {
    disablePlugins?: (PluginFactory | Plugin | undefined | null | false)[]
    disableSources?: (Source | Entry | Entry[] | undefined | null | false)[]
  } & Partial<UnionToIntersection<ExtractOptions<TSources[number]>>> &
    Partial<UnionToIntersection<ExtractOptions<TPlugins[number]>>> & {
      sources?: TSources
      plugins?: TPlugins
      schema?: TSchema
    },
): DozenInstance<TSources, TPlugins, TSchema> {
  const name = options?.name

  let sources: (Source | Entry | Entry[] | undefined | null | false)[] = [
    configFile(),
    dotenv(),
    env(),
    ...(options?.sources || []),
  ]

  if (options?.disableSources) {
    sources = sources.filter((source) => {
      return !options.disableSources!.some((disabledSource) => disabledSource === source)
    })
  }

  let plugins: (PluginFactory | Plugin | undefined | null | false)[] = [
    fileLoader,
    argvLoader,
    jsonLoader,
    envLoader,
    objectLoader,
    prefixMapper,
    coerceStringsMapper,
    keyCaseMapper,
    extendsMapper,
    pickPropertyMapper,
    assignReducer,
    parseSchemaTransformer,
    standardSchemaValidator,
    ...(options?.plugins || []),
  ]

  if (options?.disablePlugins) {
    plugins = plugins.filter((plugin) => {
      return !options.disablePlugins!.some((disabledPlugin) => disabledPlugin === plugin)
    })
  }

  const finalOptions: DozenOptions<typeof sources, typeof plugins, TSchema> = {
    prefix: name
      ? {
          byFormat: {
            env: {
              filter: `${name.toUpperCase()}_`,
              remove: `${name.toUpperCase()}_`,
            },
          },
        }
      : undefined,
    keyCase: 'camel',
    coerceStrings: {
      byFormat: {
        env: true,
        argv: true,
      },
    },
    extendsProperty: 'extends',
    pickProperty: {
      byFormat: {
        json: true,
      },
    },
    ...options,
    sources,
    plugins,
  }

  return dozen(finalOptions)
}

dozenForNode.configFile = configFile
dozenForNode.env = env
dozenForNode.dotenv = dotenv
dozenForNode.argv = argv
dozenForNode.file = file
dozenForNode.assignReducer = assignReducer
dozenForNode.deepReducer = deepReducer

export default dozenForNode
