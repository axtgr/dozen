<br>

<h1 align="center">Dozen</h1>

<p align="center">
  <strong>Load config from a dozen sources, transform and validate with Zod, Valibot or ArkType</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dozen"><img src="https://img.shields.io/npm/v/dozen" alt="npm package"></a>
  &nbsp;
  <a href="https://github.com/axtgr/dozen/actions"><img src="https://img.shields.io/github/actions/workflow/status/axtgr/dozen/ci.yml?label=CI&logo=github" alt="CI"></a>
  &nbsp;
  <a href="https://www.buymeacoffee.com/axtgr"><img src="https://img.shields.io/badge/%F0%9F%8D%BA-Buy%20me%20a%20beer-red?style=flat" alt="Buy me a beer"></a>
</p>

<br>

Dozen is a TypeScript library for Node.js-compatible runtimes. It loads configuration for your app from various sources, such as JSON and .env files, environment variables, CLI arguments, plain objects and others. It then normalizes the values (e.g. coerces to numbers and booleans) and keys (e.g. converts to camelCase), merges them into a single object and validates it against a schema if required. It can watch the sources for changes and automatically rebuild the config and notify the user.

The library is designed to be extensible by using a plugin system similar to that of Rollup/Vite. Every step of the pipeline can be customized by adding or disabling a plugin or source. For example, you can add a plugin that reads from a database or parses TOML syntax.

## Quickstart

```
npm install dozen
```

```ts
// The simplest case.

import dozen from 'dozen'

// - Reads from:
//     1. .env, .env.local, .env.${NODE_ENV}, .env.${NODE_ENV}.local files
//     2. Environment variables (process.env)
// - Coerces strings to numbers and booleans when applicable
// - Merges into a single object
// - Converts keys to camelCase

const config = await dozen().build()
```

```ts
// An advanced case.

import dozen from 'dozen'
import { z } from 'zod'

const dz = dozen({
  // Giving a name makes dozen look for config files with that name
  name: 'myapp',
  // The merged config object will be validated against this schema.
  // This can be any standard schema, e.g. from Zod, Valibot, ArkType, etc.
  schema: z.object({
    host: z.string().default('localhost'),
    port: z.number(),
    enabled: z.boolean(),
  })
})

// Sources can be added later
dz.add(dozen.file('config.json'))
dz.add(dozen.url('https://localhost:3000/config.json'))

// CLI arguments aren't read by default, but supported via dozen.argv()
dz.add(dozen.argv())

// Ignore files (.myappignore) are also supported via dozen.ignoreFiles()
dz.add(dozen.ignoreFiles())

// It accepts plain objects as well
dz.add({ port: 3000 })

// .get() returns the cached config without building it
console.log(dz.get()) // => {} because dz.build() has not been called yet

// - Reads:
//     1. The "myapp" field in package.json
//     2. myapp.config.json, myapprc.yaml, .myapprc, etc.
//        (searches up to the project root until one is found)
//     3. .env, .env.local, .env.${NODE_ENV}, .env.${NODE_ENV}.local files
//     4. Environment variables (process.env)
//     5. The config.json file in the current working directory
//     6. The https://localhost:3000/config.json URL
//     7. CLI arguments (process.argv)
//     8. .myappignore files
//        (searches up to the project root until one is found)
//     9. The config object passed to dz.add()
// - For env values, keeps only those with the MYAPP_ prefix, then removes the prefix
// - Adds patterns from .myappignore files to the array in the "ignore" property
// - Coerces strings to numbers and booleans for env and argv values when applicable
// - Converts keys to camelCase
// - Validates with the schema

const config = await dz.build()

console.log(dz.get()) // => { host: 'localhost', port: 8008, enabled: true }
console.log(config) // Same as above
```

## API

### `dozen(options?: Options): Instance`

Creates an instance of Dozen with the default preset merged with the given options.

### Instance

The default preset includes plugins and sources tuned for Node.js-compatible runtimes.

It loads from the following sources:

1. The "myapp" field in package.json (if the "name" option is "myapp");
2. myapp.config.json, myapprc.yaml, .myapprc and other config files with the given name (if the "name" option is "myapp");
3. .env, .env.local, .env.${NODE_ENV}, .env.${NODE_ENV}.local files;
4. Environment variables (process.env);

After that, for env values, it keeps only those with the MYAPP_ prefix, then removes
the prefix from them. Then, it coerces strings to numbers and booleans for env and argv
values when applicable, then merges and validates the config object with the given schema
(if provided).


#### `async .build(): Promise\<object\>`

Builds the config object (if needed) and returns it.

If there have been changes in the sources since the last build, the corresponding
sources (and only them) will be loaded and mapped, and the config object will be rebuilt,
otherwise the cached config object will be returned.

#### `.get(): object`

Returns the currently cached config object. If the config object has not been built yet,
returns an empty object.

#### `.add(items: Source | object | undefined | null | false | (Source | object | undefined | null | false)[]): Instance`

Adds one or more sources or values to the pipeline. Falsy values are ignored.

If watching is enabled, this will trigger a rebuild, otherwise build() has to be called manually.

#### `.fork(options?: Options): Instance`

Creates a new instance of Dozen that inherits the current instance's options, sources and plugins, and adds its own. When building, the fork will first call build() on the parent instance, then build on top of it.

#### `.watch(cb?: (config: object) => void): Watcher`

Starts watching for changes in sources and rebuilds the config object so that get() always returns an up-to-date config. If a callback is provided, it will be called with the updated config.

Returns a watcher object that can be used to control the watching and catch errors.

```js
const watcher = dz.watch((config) => console.log(config))
watcher.catch((err) => console.error(err))
watcher.stop()
watcher.start()
```

### Options

These options are used by Dozen itself:

| Option           | Type                                                           | Description                                                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sources`        | `(Source \| Entry \| Entry[] \| undefined \| null \| false)[]` | An array of sources to load from.                                                                                                                                                                      |
| `plugins`        | `(PluginFactory \| Plugin \| undefined \| null \| false)[]`    | An array of plugins to use.                                                                                                                                                                            |
| `disableSources` | `(Source \| Entry \| Entry[] \| undefined \| null \| false)[]` | An array of sources to disable. Use to disable default sources.                                                                                                                                        |
| `disablePlugins` | `(PluginFactory \| Plugin \| undefined \| null \| false)[]`    | An array of plugins to disable. Use to disable default plugins.                                                                                                                                        |
| `cwd`            | `string`                                                       | Working directory. File paths will be resolved relative to this. Defaults to process.cwd()                                                                                                             |
| `projectRoot`    | `string`                                                       | Path to the project root. When searching for files, some plugins will traverse directories from `cwd` to `projectRoot`. Defaults to the nearest ancestor of `cwd` that contains a `package.json` file. |
| `defaults`       | `object`                                                       | An object with values to use as defaults. Alternatively, if you provide a schema, you can set default values there.                                                                                    |

These are options used by the default plugins (if a plugin is disabled, its options are ignored):

| Option            | Type                                                                                                                                                                           | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`            | `string`                                                                                                                                                                       | The name of the app. Used to search for config files and package.json fields, and as a prefix for env vars.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `schema`          | `StandardSchemaV1`                                                                                                                                                             | The schema to validate against. By default, any Standard Schema library is supported (e.g. Zod, Valibot, ArkType).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `configFiles`     | `{ lookUpUntil?: string \| boolean }`                                                                                                                                          | `lookUpUntil`: when true, will search for config files from `cwd` up to `projectRoot`; when false, will search for config files only in `cwd`; when a path, will search for config files in directories from `cwd` up to the path.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `ignorePatterns`  | `{ field?: string }`                                                                                                                                                           | Defines what to do with ignore patterns from files like .gitignore and other sources. `field`: defines the field to set to the array of ignore patterns (e.g. if `field` is set to `"exclude"`, a .gitignore file containing the two lines `dist/` and `build/` would be parsed into `{ exclude: ['dist/', 'build/'] }`). Defaults to `ignore`.                                                                                                                                                                                                                                                                                                                                 |
| `prefix`          | `{ filter?: boolean \| string; remove?: boolean \| string; byFormat?: Record<string, { filter?: boolean \| string; remove?: boolean \| string }> }`                            | `filter`: when true, only keys starting with `name` will be kept.; when a string, only keys starting with that string will be kept; when false, all keys will be kept.<br>`remove`: when true, the prefix matching `name` will be removed from keys; when a string, the prefix matching that string will be removed; when false, no prefix will be removed.<br>`byFormat`: an object that specifies prefix options for each format separately (e.g. `env: { filter: true, remove: false }`).                                                                                                                                                                                    |
| `keyCase`         | `'camel' \| 'pascal' \| 'kebab' \| 'snake' \| 'constant' \| 'upper' \| 'upperFirst' \| 'lower' \| 'lowerFirst' \| 'swap' \| 'capital' \| 'dot' \| 'none' \| 'path' \| 'title'` | The string case to convert keys to. Defaults to `camel`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `coerceStrings`   | `{ boolean?: boolean; number?: boolean; byFormat?: Record<string, boolean \| { boolean?: boolean; number?: boolean }> }`                                                       | `boolean`: when true, converts strings "true" and "false" to their boolean counterparts.<br>`number`: when true, converts numerical strings to numbers ("12" → 12).<br>`byFormat`: an object that specifies coerceStrings options for each format separately (e.g. `env: { boolean: true, number: false }`).                                                                                                                                                                                                                                                                                                                                                                    |
| `extendsProperty` | `string`                                                                                                                                                                       | The property to use as a file path for extending the config object. For example, if the value is "extends", and one of the sources has this property set to "base.json", Dozen will attempt to load "base.json".                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `flattenProperty` | `boolean \| string \| { key: string \| boolean; keepBase?: boolean; byFormat: Record<string, boolean \| string \| { key: string \| boolean; keepBase?: boolean> }`             | The property of a value to use instead of the value itself. For example, when it's "foo", the entry `{ foo: { bar: 'baz' } }` will be replaced with `{ bar: 'baz' }`. When true, uses the `name` option; when false, doesn't flatten anything; when a string, uses that property. When `keepBase` is true, it will merge the property into its parent object, otherwise it will replace it (default).<br>`byFormat`: an object that specifies flattenProperty options for each format separately (e.g. `env: { key: true, keepBase: true }`).<br>By default this is used to replace `package.json` entries with the value of their property whose key equals the `name` option. |
| `parseWithSchema` | `boolean \| ((config: object, schema: unknown) => Promise<object> \| object)`                                                                                                  | If the `schema` option is set, and this value is true or undefined, Dozen will attempt to call `schema.parse(config)`; if this value is a function, it will be called instead.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `transform`       | `(config: object) => Promise<object> \| object`                                                                                                                                | A custom function for transforming the config object before it is validated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

All are optional.
