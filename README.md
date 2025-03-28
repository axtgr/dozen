<br>

<h1 align="center">dozen</h1>

<p align="center">
  <strong>Load config from a dozen sources, normalize and validate with Zod</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dozen"><img src="https://img.shields.io/npm/v/dozen" alt="npm package"></a>
  &nbsp;
  <a href="https://www.buymeacoffee.com/axtgr"><img src="https://img.shields.io/badge/%F0%9F%8D%BA-Buy%20me%20a%20beer-red?style=flat" alt="Buy me a beer"></a>
</p>

<br>

## Quickstart

```
npm install dozen
```

```js
import dozen from 'dozen'

// The simplest case.

// - Synchronously reads from:
//     1. .env, .env.local, .env.${NODE_ENV}, .env.${NODE_ENV}.local files
//     2. Environment variables (process.env)
// - Coerces strings to numbers and booleans when applicable
// - Merges into a single object
// - Converts keys to camelCase

const config = dozen().get()
```

```js
import dozen from 'dozen'
import { z } from 'zod'

// An advanced case.

const dz = dozen({
  // Giving a name makes dozen look for config files with that name
  name: 'myapp',
  // The merged config object will be validated against this schema.
  // This can be any standard schema, e.g. from Zod, Valibot, Arktype, etc.
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

// - Asynchronously reads from:
//     1. The "myapp" field in package.json, myapp.config.json, myapprc.yaml, etc.
//     2. .env, .env.local, .env.${NODE_ENV}, .env.${NODE_ENV}.local files
//     3. Environment variables (process.env)
//     4. The config.json file in the current working directory
//     5. CLI arguments (process.argv)
//     6. The config object passed to dz.add()
// - For env values, keeps only those with the MYAPP_ prefix, then removes the prefix
// - Coerces strings to numbers and booleans for env and argv values when applicable
// - Converts keys to camelCase
// - Validates with the schema

const config = await dzn.getAsync()
```
