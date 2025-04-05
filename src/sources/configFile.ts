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
        id: 'configFile',
        format: ['configFile'],
        value: name,
      },
    ]
  }
}

export default configFile
export type { ConfigFileSourceOptions }
