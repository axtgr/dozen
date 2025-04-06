<br>

<h1 align="center">dozen</h1>

<p align="center">
  <strong>Load config from a dozen sources, normalize and validate with Zod, Valibot or ArkType</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dozen"><img src="https://img.shields.io/npm/v/dozen" alt="npm package"></a>
  &nbsp;
  <a href="https://www.buymeacoffee.com/axtgr"><img src="https://img.shields.io/badge/%F0%9F%8D%BA-Buy%20me%20a%20beer-red?style=flat" alt="Buy me a beer"></a>
</p>

<br>

Dozen is a TypeScript library for Node.js/Bun that loads configuration for your app from various sources, such as config files, .env files, environment variables, CLI arguments, plain objects and others. It then normalizes the values (e.g. coerces to numbers and booleans) and keys (e.g. converts to camelCase), merges them into a single object and validates it against a schema if required. It can watch the sources for changes and automatically rebuild the config and notify the user.

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
    host: z.string(),
    port: z.number(),
    enabled: z.boolean(),
  })
})

// Sources can be added later
dz.add(dozen.file('config.json'))

// CLI arguments aren't read by default, but supported via dozen.argv()
dz.add(dozen.argv())

// It accepts partial config objects as well
dz.add({ port: 8008 })

// - Reads from:
//     1. The "myapp" field in package.json
//     2. myapp.config.json, myapprc.yaml, .myapprc and other config files with the given name
//     3. .env, .env.local, .env.${NODE_ENV}, .env.${NODE_ENV}.local files
//     4. Environment variables (process.env)
//     5. The config.json file in the current working directory
//     5. CLI arguments (process.argv)
//     6. The config object passed to dz.add()
// - For env values, keeps only those with the MYAPP_ prefix, then removes the prefix
// - Coerces strings to numbers and booleans for env and argv values when applicable
// - Converts keys to camelCase
// - Validates with the schema

const config = await dzn.build()
```

## API

### dozen(options?: Options): Instance

Creates an instance of Dozen with the default preset.

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


### .build(): Promise\<object\>

Builds the config object (if needed) and returns it.

If there have been changes in the sources since the last build, the corresponding
sources (and only them) will be loaded and mapped, and the config object will be rebuilt,
otherwise the cached config object will be returned.

### .get(): object

Returns the currently cached config object. If the config object has not been built yet,
returns an empty object.

### .add(items: Source | object | undefined | null | false | (Source | object | undefined | null | false)[]): Instance

Adds one or more sources or values to the pipeline. Falsy values are ignored.

If watching is enabled, this will trigger a rebuild, otherwise build() has to be called manually.

### .fork(options?: Options): Instance

Creates a new instance of Dozen that inherits the current instance's options, sources and plugins, and adds its own. When building, the fork will first call build() on the parent instance, then build on top of it.

### .watch(cb?: (config: object) => void): () => void

Starts watching for changes in sources and rebuilds the config object so that get() always returns the up-to-date config. If a callback is provided, it will be called with the updated config.

Returns a function that can be called to stop watching.

### .unwatch(cb?: (config: object) => void): () => void

Stops watching for changes. If a callback is provided, only the corresponding watcher will be removed, otherwise removes all watchers.

### Options

These options are used by Dozen itself:

| Option           | Type                                                                        | Description                                                     |
| ---------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `sources`        | `undefined \| (Source \| Entry \| Entry[] \| undefined \| null \| false)[]` | An array of sources to load from.                               |
| `plugins`        | `undefined \| (PluginFactory \| Plugin \| undefined \| null \| false)[]`    | An array of plugins to use.                                     |
| `disableSources` | `undefined \| (Source \| Entry \| Entry[] \| undefined \| null \| false)[]` | An array of sources to disable. Use to disable default sources. |
| `disablePlugins` | `undefined \| (PluginFactory \| Plugin \| undefined \| null \| false)[]`    | An array of plugins to disable. Use to disable default plugins. |

These are options used by the default plugins (if a plugin is disabled, its options are ignored):

| Option            | Type                                                                                                                                                                                        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`            | `undefined \| string`                                                                                                                                                                       | The name of the app. Used to search config files and package.json fields, and as a prefix for env vars.                                                                                                                                                                                                                                                                                                                                                                                      |
| `schema`          | `undefined \| StandardSchemaV1`                                                                                                                                                             | The schema to validate against. By default, any Standard Schema library is supported (e.g. Zod, Valibot, ArkType).                                                                                                                                                                                                                                                                                                                                                                           |
| `prefix`          | `undefined \| { filter?: boolean \| string; remove?: boolean \| string; byFormat?: Record<string, { filter?: boolean \| string; remove?: boolean \| string }> }`                            | `filter`: when true, only keys starting with `name` will be kept.; when a string, only keys starting with that string will be kept; when false, all keys will be kept.<br>`remove`: when true, the prefix matching `name` will be removed from keys; when a string, the prefix matching that string will be removed; when false, no prefix will be removed.<br>`byFormat`: an object that specifies prefix options for each format separately (e.g. `env: { filter: true, remove: false }`). |
| `keyCase`         | `undefined \| 'camel' \| 'pascal' \| 'kebab' \| 'snake' \| 'constant' \| 'upper' \| 'upperFirst' \| 'lower' \| 'lowerFirst' \| 'swap' \| 'capital' \| 'dot' \| 'none' \| 'path' \| 'title'` | The string case to convert keys to. Defaults to `camel`.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `coerceStrings`   | `undefined \| { boolean?: boolean; number?: boolean; byFormat?: Record<string, boolean \| { boolean?: boolean; number?: boolean }> }`                                                       | `boolean`: when true, converts strings "true", "1", "false" and "0" to their boolean counterparts.<br>`number`: when true, converts numerical strings to numbers ("12" → 12).<br>`byFormat`: an object that specifies coerceStrings options for each format separately (e.g. `env: { boolean: true, number: false }`).                                                                                                                                                                       |
| `extendsProperty` | `undefined \| string`                                                                                                                                                                       | The property to use as a file path for extending the config object. For example, if the value is "extends", and one of the sources has this property set to "base.json", Dozen will attempt to load "base.json".                                                                                                                                                                                                                                                                             |
