import type { Source } from '../types.ts'

interface ConfigFileSourceOptions {
  name?: string
}

/**
 * Provides config file paths as an entry.
 */
function configFile(options?: ConfigFileSourceOptions): Source<ConfigFileSourceOptions> {
  return (_options) => {
    const name = options?.name || _options.name
    if (!name) return []
    return [
      {
        id: 'configFiles',
        format: ['file'],
        value: [
          // The order is important here because it defines the priority of the files:
          // the first file to load will be the one used. However, these files are
          // loaded by two different loaders (jsLoader and fileLoader), and JS/TS files
          // will load before JSON ones no matter their position in the array, because
          // jsLoader comes before fileLoader.

          // Loaded by jsLoader
          `${name}.config.mts`,
          `${name}.config.cts`,
          `${name}.config.ts`,
          `${name}.config.mjs`,
          `${name}.config.cjs`,
          `${name}.config.js`,
          `${name}rc.mjs`,
          `${name}rc.cjs`,
          `${name}rc.js`,
          `.config/${name}rc.js`,
          `.config/${name}rc.cjs`,
          `.config/${name}rc.mjs`,

          // Loaded by fileLoader
          `.${name}.config.json`,
          `.${name}rc.json`,
          `.config/${name}rc`,
          `.config/${name}rc.json`,
        ],
      },
    ]
  }
}

export default configFile
export type { ConfigFileSourceOptions }
