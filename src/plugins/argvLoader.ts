import { parseArgs } from 'node:util'
import type { Plugin } from '../types.ts'

type ArgvLoaderPluginOptions = object

const argvLoaderPlugin: Plugin<ArgvLoaderPluginOptions> = {
  name: 'argvLoader',
  canLoadSync: (entry) => {
    return Boolean(entry.tags?.includes('argv') && (!entry.value || Array.isArray(entry.value)))
  },
  loadSync: (entry) => {
    const { values } = parseArgs({
      args: entry.value as string[],
      strict: false,
      allowNegative: true,
    })
    return [
      {
        ...entry,
        loaded: true,
        value: values,
      },
    ]
  },
}

export default argvLoaderPlugin
export type { ArgvLoaderPluginOptions }
