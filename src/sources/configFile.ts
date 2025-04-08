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
          `.${name}rc.json`,
          `.${name}rc.js`,
          `.${name}rc.cjs`,
          `.${name}rc.mjs`,
          `.config/${name}rc`,
          `.config/${name}rc.json`,
          `.config/${name}rc.js`,
          `.config/${name}rc.cjs`,
          `.config/${name}rc.mjs`,
          `${name}.config.js`,
          `${name}.config.cjs`,
          `${name}.config.mjs`,
        ],
      },
    ]
  }
}

export default configFile
export type { ConfigFileSourceOptions }
