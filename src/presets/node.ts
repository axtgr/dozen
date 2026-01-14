import Path from 'node:path'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import { findFileUpSync } from '../fileUtils.ts'
import vanillaDozen, {
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
import customTransformer, { type CustomTransformerOptions } from '../plugins/customTransformer.ts'
import deepReducer from '../plugins/deepReducer.ts'
import envLoader, { type EnvLoaderOptions } from '../plugins/envLoader.ts'
import extendsMapper, { type ExtendsMapperOptions } from '../plugins/extendsMapper.ts'
import fetchLoader, { type FetchLoaderOptions } from '../plugins/fetchLoader.ts'
import fileLoader, { type FileLoaderOptions } from '../plugins/fileLoader.ts'
import flattenPropertyMapper, {
  type FlattenPropertyMapperOptions,
} from '../plugins/flattenPropertyMapper.ts'
import ignoreLoader, { type IgnoreLoaderOptions } from '../plugins/ignoreLoader.ts'
import jsLoader, { type JsLoaderOptions } from '../plugins/jsLoader.ts'
import jsonLoader, { type JsonLoaderOptions } from '../plugins/jsonLoader.ts'
import keyCaseMapper, { type KeyCaseMapperOptions } from '../plugins/keyCaseMapper.ts'
import objectLoader, { type ObjectLoaderOptions } from '../plugins/objectLoader.ts'
import parseWithSchemaTransformer, {
  type ParseWithSchemaTransformerOptions,
} from '../plugins/parseWithSchemaTransformer.ts'
import prefixMapper, { type PrefixMapperOptions } from '../plugins/prefixMapper.ts'
import standardSchemaValidator, {
  type StandardSchemaValidatorOptions,
} from '../plugins/standardSchemaValidator.ts'
import argv from '../sources/argv.ts'
import configFiles, { type ConfigFilesSourceOptions } from '../sources/configFiles.ts'
import dotenv, { type DotenvSourceOptions } from '../sources/dotenv.ts'
import env, { type EnvSourceOptions } from '../sources/env.ts'
import file from '../sources/file.ts'
import ignoreFiles from '../sources/ignoreFiles.ts'
import raw from '../sources/raw.ts'
import url from '../sources/url.ts'
import type { Entry, Plugin, PluginFactory, Source } from '../types.ts'

type SourceValue = Source | Entry | Entry[] | undefined | null | false
type PluginValue = PluginFactory | Plugin | undefined | null | false

type DozenNodeOptions<
  TSources extends SourceValue[],
  TPlugins extends PluginValue[],
  TSchema extends StandardSchemaV1 | unknown = unknown,
> = Omit<
  DozenOptions<
    [Source<ConfigFilesSourceOptions>, Source<DotenvSourceOptions>, Source<EnvSourceOptions>],
    [
      Plugin<JsLoaderOptions>,
      Plugin<FileLoaderOptions>,
      Plugin<FetchLoaderOptions>,
      Plugin<ArgvLoaderOptions>,
      Plugin<ObjectLoaderOptions>,
      Plugin<JsonLoaderOptions>,
      Plugin<EnvLoaderOptions>,
      Plugin<IgnoreLoaderOptions>,
      Plugin<PrefixMapperOptions>,
      Plugin<CoerceStringsMapperOptions>,
      Plugin<KeyCaseMapperOptions>,
      Plugin<ExtendsMapperOptions>,
      Plugin<FlattenPropertyMapperOptions>,
      Plugin<AssignReducerOptions>,
      Plugin<ParseWithSchemaTransformerOptions>,
      Plugin<CustomTransformerOptions>,
      Plugin<StandardSchemaValidatorOptions>,
    ],
    TSchema
  >,
  'sources' | 'plugins' | 'schema'
> & {
  /**
   * The name of the app. Used to search for config files and package.json fields, and as a prefix for env vars.
   */
  name?: string
  /**
   * An array of plugins to disable. Use to disable default plugins.
   */
  disablePlugins?: (PluginFactory | Plugin | undefined | null | false)[]
  /**
   * An array of sources to disable. Use to disable default sources.
   */
  disableSources?: (Source | Entry | Entry[] | undefined | null | false)[]
  /**
   * Working directory. File paths will be resolved relative to this. Defaults to process.cwd()
   */
  cwd?: string
  /**
   * Path to the project root. When searching for files, some plugins will traverse directories from `cwd` to `projectRoot`. Defaults to the nearest ancestor of `cwd` that contains a `package.json` file.
   */
  projectRoot?: string
  /**
   * An object with values to use as defaults. Alternatively, if you provide a schema, you can set default values there.
   */
  defaults?: object
} & Partial<UnionToIntersection<ExtractOptions<TSources[number]>>> &
  Partial<UnionToIntersection<ExtractOptions<TPlugins[number]>>> & {
    /**
     * An array of sources to load from.
     */
    sources?: TSources
    /**
     * An array of plugins to use.
     */
    plugins?: TPlugins
    /**
     * The schema to validate against. By default, any Standard Schema library is supported (e.g. Zod, Valibot, ArkType).
     */
    schema?: TSchema
  }

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
 *
 * @example
 * ```
 * import dozen from 'dozen'
 *
 * const config = await dozen({
 *   name: 'myapp',
 *   schema: z.object({
 *     host: z.string().default('localhost'),
 *     port: z.number().default(8008),
 *     logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
 *   })
 * }).build()
 *
 * console.log(config) // { host: 'localhost', port: 8008, logLevel: 'info' }
 * ```
 */
function dozen<
  TSources extends SourceValue[],
  TPlugins extends PluginValue[],
  TSchema extends StandardSchemaV1 | unknown = unknown,
>(
  options?: DozenNodeOptions<TSources, TPlugins, TSchema>,
): DozenInstance<TSources, TPlugins, TSchema> {
  const name = options?.name

  let sources: (Source | Entry | Entry[] | undefined | null | false)[] = [
    options?.defaults && raw(options.defaults),
    configFiles(),
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
    jsLoader,
    fileLoader,
    fetchLoader,
    argvLoader,
    jsonLoader,
    envLoader,
    ignoreLoader,
    objectLoader,
    prefixMapper,
    coerceStringsMapper,
    keyCaseMapper,
    extendsMapper,
    flattenPropertyMapper,
    assignReducer,
    parseWithSchemaTransformer,
    customTransformer,
    standardSchemaValidator,
    ...(options?.plugins || []),
  ]

  if (options?.disablePlugins) {
    plugins = plugins.filter((plugin) => {
      return !options.disablePlugins!.some((disabledPlugin) => disabledPlugin === plugin)
    })
  }

  const cwd = Path.resolve(options?.cwd || process.cwd())

  let projectRoot = options?.projectRoot
  if (projectRoot) {
    projectRoot = Path.resolve(projectRoot)
  } else {
    const filePath = findFileUpSync('package.json', cwd)
    projectRoot = filePath ? Path.dirname(filePath) : cwd
  }

  const finalOptions = {
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
    flattenProperty: {
      byFormat: {
        'package.json': true,
      },
    },
    ...options,
    cwd,
    projectRoot,
    sources,
    plugins,
  } as DozenOptions<typeof sources, typeof plugins, TSchema>

  return vanillaDozen(finalOptions)
}

dozen.configFiles = configFiles
dozen.ignoreFiles = ignoreFiles
dozen.env = env
dozen.dotenv = dotenv
dozen.argv = argv
dozen.file = file
dozen.url = url
dozen.assignReducer = assignReducer
dozen.deepReducer = deepReducer

export default dozen
