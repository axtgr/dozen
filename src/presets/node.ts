import fs from 'node:fs'
import Path from 'node:path'
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
import flattenPropertyMapper, {
  type FlattenPropertyMapperOptions,
} from '../plugins/flattenPropertyMapper.ts'
import jsLoader, { type JsLoaderOptions } from '../plugins/jsLoader.ts'
import jsonLoader, { type JsonLoaderOptions } from '../plugins/jsonLoader.ts'
import keyCaseMapper, { type KeyCaseMapperOptions } from '../plugins/keyCaseMapper.ts'
import objectLoader, { type ObjectLoaderOptions } from '../plugins/objectLoader.ts'
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

function findFileUpSync(
  name: string,
  cwd = process.cwd(),
  type: 'any' | 'file' | 'directory' = 'any',
  stopAt?: string,
) {
  let directory = Path.resolve(cwd)
  const { root } = Path.parse(directory)
  const isAbsoluteName = Path.isAbsolute(name)
  stopAt = Path.resolve(directory, stopAt ?? root)

  while (directory) {
    const filePath = isAbsoluteName ? name : Path.join(directory, name)

    try {
      const stats = fs.statSync(filePath, { throwIfNoEntry: false })
      if (
        (type === 'any' && stats) ||
        (type === 'file' && stats?.isFile()) ||
        (type === 'directory' && stats?.isDirectory())
      ) {
        return filePath
      }
    } catch {}

    if (directory === stopAt || directory === root) {
      break
    }

    directory = Path.dirname(directory)
  }
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
        Plugin<JsLoaderOptions>,
        Plugin<FileLoaderOptions>,
        Plugin<ArgvLoaderOptions>,
        Plugin<ObjectLoaderOptions>,
        Plugin<JsonLoaderOptions>,
        Plugin<EnvLoaderOptions>,
        Plugin<PrefixMapperOptions>,
        Plugin<CoerceStringsMapperOptions>,
        Plugin<KeyCaseMapperOptions>,
        Plugin<ExtendsMapperOptions>,
        Plugin<FlattenPropertyMapperOptions>,
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
    cwd?: string
    projectRoot?: string
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
    jsLoader,
    fileLoader,
    argvLoader,
    jsonLoader,
    envLoader,
    objectLoader,
    prefixMapper,
    coerceStringsMapper,
    keyCaseMapper,
    extendsMapper,
    flattenPropertyMapper,
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
