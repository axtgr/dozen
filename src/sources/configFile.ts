import type { Source } from '../types.ts'

interface ConfigFileSourceOptions {
  name?: string
}

function configFile(options?: ConfigFileSourceOptions): Source<ConfigFileSourceOptions> {
  return (_options) => {
    return [
      {
        id: 'configFile',
        tags: ['configFile'],
        value: options?.name || _options.name,
      },
    ]
  }
}

export default configFile
export type { ConfigFileSourceOptions }
