import type { Entry, Plugin } from './types.ts'
import { toFilteredArray } from './utils.ts'

interface WrappedPlugin<TOptions extends object> {
  name: string
  loadSync?: (entry: Entry, options: TOptions) => Entry[]
  loadAsync?: (entry: Entry, options: TOptions) => Promise<Entry[]>
  mapSync?: (entry: Entry, options: TOptions) => Entry[]
  mapAsync?: (entry: Entry, options: TOptions) => Promise<Entry[]>
  reduceSync?: (config: object, entry: Entry, options: TOptions) => object
  reduceAsync?: (config: object, entry: Entry, options: TOptions) => Promise<object>
  transformSync?: (config: object, options: TOptions) => object
  transformAsync?: (config: object, options: TOptions) => Promise<object>
  validateSync?: (config: object, options: TOptions) => void
  validateAsync?: (config: object, options: TOptions) => Promise<void>
}

function wrapPlugin<TOptions extends object>(plugin: Plugin<TOptions>) {
  const wrappedPlugin: WrappedPlugin<TOptions> = {
    name: plugin.name,
  }

  if (plugin.loadSync) {
    wrappedPlugin.loadSync = (entry, options) => {
      const result = plugin.loadSync!(entry, options)
      return toFilteredArray(result)
    }
  }

  if (plugin.loadAsync) {
    wrappedPlugin.loadAsync = async (entry, options) => {
      const result = await plugin.loadAsync!(entry, options)
      return toFilteredArray(result)
    }
  } else if (wrappedPlugin.loadSync) {
    wrappedPlugin.loadAsync = async (entry, options) => wrappedPlugin.loadSync!(entry, options)
  }

  if (plugin.mapSync) {
    wrappedPlugin.mapSync = (entry, options) => {
      const result = plugin.mapSync!(entry, options)
      return toFilteredArray(result)
    }
  }

  if (plugin.mapAsync) {
    wrappedPlugin.mapAsync = async (entry, options) => {
      const result = await plugin.mapAsync!(entry, options)
      return toFilteredArray(result)
    }
  } else if (wrappedPlugin.mapSync) {
    wrappedPlugin.mapAsync = async (entry, options) => wrappedPlugin.mapSync!(entry, options)
  }

  if (plugin.reduceSync) {
    wrappedPlugin.reduceSync = (config, entry, options) => {
      return plugin.reduceSync!(config, entry, options)
    }
  }

  if (plugin.reduceAsync) {
    wrappedPlugin.reduceAsync = async (config, entry, options) => {
      return plugin.reduceAsync!(config, entry, options)
    }
  } else if (wrappedPlugin.reduceSync) {
    wrappedPlugin.reduceAsync = async (config, entry, options) => {
      return wrappedPlugin.reduceSync!(config, entry, options)
    }
  }

  if (plugin.transformSync) {
    wrappedPlugin.transformSync = (config, options) => {
      return plugin.transformSync!(config, options)
    }
  }

  if (plugin.transformAsync) {
    wrappedPlugin.transformAsync = async (config, options) => {
      return plugin.transformAsync!(config, options)
    }
  } else if (wrappedPlugin.transformSync) {
    wrappedPlugin.transformAsync = async (config, options) => {
      return wrappedPlugin.transformSync!(config, options)
    }
  }

  if (plugin.validateSync) {
    wrappedPlugin.validateSync = (config, options) => {
      return plugin.validateSync!(config, options)
    }
  }

  if (plugin.validateAsync) {
    wrappedPlugin.validateAsync = async (config, options) => {
      return plugin.validateAsync!(config, options)
    }
  } else if (wrappedPlugin.validateSync) {
    wrappedPlugin.validateAsync = async (config, options) => {
      return wrappedPlugin.validateSync!(config, options)
    }
  }

  return wrappedPlugin
}

export default wrapPlugin
export type { WrappedPlugin }
