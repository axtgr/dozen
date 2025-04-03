import type { ReadableStreamDefaultController } from 'node:stream/web'
import type { Entry, Plugin } from './types.ts'
import { toFilteredArray } from './utils.ts'

interface WrappedPlugin<TOptions extends object> {
  name: string
  load?: (entry: Entry, options: TOptions) => Promise<Entry[]>
  map?: (entry: Entry, options: TOptions) => Promise<Entry[]>
  reduce?: (config: object, entry: Entry, options: TOptions) => Promise<object>
  transform?: (config: object, options: TOptions) => Promise<object>
  validate?: (config: object, options: TOptions) => Promise<void>
  watch?: (cb: (entry: Entry) => void, options: TOptions) => void
  unwatch?: (cb: (entry: Entry) => void, options: TOptions) => void
}

function wrapPlugin<TOptions extends object>(plugin: Plugin<TOptions>) {
  const wrappedPlugin: WrappedPlugin<TOptions> = {
    name: plugin.name,
    reduce: plugin.reduce,
    transform: plugin.transform,
    validate: plugin.validate,
    watch: plugin.watch,
    unwatch: plugin.unwatch,
  }

  if (plugin.load) {
    wrappedPlugin.load = async (entry, options) => {
      const result = await plugin.load!(entry, options)
      return toFilteredArray(result)
    }
  }

  if (plugin.map) {
    wrappedPlugin.map = async (entry, options) => {
      const result = await plugin.map!(entry, options)
      return toFilteredArray(result)
    }
  }

  return wrappedPlugin
}

export default wrapPlugin
export type { WrappedPlugin }
