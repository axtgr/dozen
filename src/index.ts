import type { StandardSchemaV1 } from '@standard-schema/spec'
import forkLoader from './plugins/forkLoader.ts'
import fork from './sources/fork.ts'
import rawSource from './sources/raw.ts'
import type { Entry, Plugin, PluginFactory, Source } from './types.ts'
import { toFilteredArray } from './utils.ts'
import wrapPlugin from './wrapPlugin.ts'

type ExtractOptions<T> = T extends Source<infer O>
  ? O
  : T extends PluginFactory<infer O>
    ? O
    : T extends Plugin<infer O>
      ? O
      : never

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never

type DozenInstance<
  TSources extends (Source | Entry | Entry[] | undefined | null | false)[],
  TPlugins extends (PluginFactory | Plugin | undefined | null | false)[],
  TSchema extends StandardSchemaV1 | unknown = unknown,
> = {
  /**
   * Returns the currently cached config object.
   */
  get(): TSchema extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<TSchema> : object

  /**
   * Builds the config object if needed and returns it.
   *
   * If there have been changes in the sources since the last build, the corresponding
   * sources will be loaded and mapped, and the config object will be rebuilt, otherwise
   * the cached config object will be returned.
   */
  build(): Promise<
    TSchema extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<TSchema> : object
  >

  /**
   * Adds one or more sources or values to the pipeline.
   *
   * If watching is enabled, this will trigger a rebuild,
   * otherwise build() has to be called manually.
   */
  add(
    items:
      | Source
      | object
      | undefined
      | null
      | false
      | (Source | object | undefined | null | false)[],
  ): DozenInstance<TSources, TPlugins, TSchema>

  /**
   * Creates a new instance of Dozen that inherits the current instance's options,
   * sources and plugins, and adds its own. When building, the fork will first call
   * build() on the parent instance, then build with on top of it.
   */
  fork(
    forkOptions?: DozenOptions<TSources, TPlugins, TSchema>,
  ): DozenInstance<TSources, TPlugins, TSchema>

  /**
   * Creates a watcher that waits for changes in sources and rebuilds the config object
   * so that get() always returns the up-to-date config. If a callback is provided,
   * it will be called with the updated config.
   *
   * @returns A function that can be called to stop watching.
   */
  watch(cb?: (config: object) => void): () => void

  /**
   * Stops watching for changes. If a callback is provided, only the corresponding
   * watcher will be stopped, otherwise removes all watchers.
   */
  unwatch(cb?: (config: object) => void): void
}

type DozenOptions<
  TSources extends (Source | Entry | Entry[] | undefined | null | false)[],
  TPlugins extends (PluginFactory | Plugin | undefined | null | false)[],
  TSchema extends StandardSchemaV1 | unknown = unknown,
> = {
  sources?: TSources
  plugins?: TPlugins
  schema?: TSchema
} & UnionToIntersection<ExtractOptions<TSources[number]>> &
  UnionToIntersection<ExtractOptions<TPlugins[number]>>

/**
 * Creates a barebones instance of Dozen without any sources or plugins.
 */
function dozen<
  TSources extends (Source | Entry | Entry[] | undefined | null | false)[],
  TPlugins extends (PluginFactory | Plugin | undefined | null | false)[],
  TSchema extends StandardSchemaV1 | unknown = unknown,
>(options: DozenOptions<TSources, TPlugins, TSchema>) {
  const plugins = toFilteredArray(options.plugins).map((pluginOrFactory) => {
    const plugin =
      typeof pluginOrFactory === 'function' ? pluginOrFactory(options) : pluginOrFactory
    return wrapPlugin(plugin)
  })

  const entries: Entry[] = []
  let config: object = {}
  let entriesUpdated = false
  let promise = Promise.resolve()

  const watchCbs = new Set<(config: object) => void>()
  const watchCbForPlugins = (entry: Entry) => {
    spliceEntry(entry, true, false)
    build()
  }

  const removeSubtree = (entryId: string, removeItself = true) => {
    if (removeItself) {
      const index = entries.findIndex((entry) => entry.id === entryId)
      if (index !== -1) {
        entries.splice(index, 1)
        entriesUpdated = true
      }
    }
    entries
      .filter((entry) => entry.parentId === entryId)
      .forEach((entry) => {
        removeSubtree(entry.id!, true)
      })
  }

  const spliceEntry = (entry: Entry, replaceSelf: boolean, putBeforeParent: boolean) => {
    const selfIndex = entries.findIndex((e) => e.id === entry.id)
    let parentIndex = entry.parentId ? entries.findIndex((e) => e.id === entry.parentId) : -1

    if (parentIndex === -1) {
      if (selfIndex === -1) {
        entries.push(entry)
      } else if (replaceSelf) {
        entries.splice(selfIndex, 1, entry)
      } else {
        entries.splice(selfIndex, 1)
        entries.push(entry)
      }
    } else {
      if (selfIndex !== -1) {
        entries.splice(selfIndex, 1)
      }
      parentIndex += selfIndex === -1 || selfIndex > parentIndex || !replaceSelf ? 0 : -1
      if (putBeforeParent) {
        entries.splice(parentIndex, 0, entry)
      } else {
        entries.splice(parentIndex + 1, 0, entry)
      }
    }

    // A pending entry means it's going to be loaded and mapped producing a new set
    // of child entries, so we remove the existing children.
    if (entry.status === 'pending') {
      removeSubtree(entry.id, false)
    }

    entriesUpdated = true
  }

  const loadEntries = async () => {
    let gotNewEntries = false

    const promises = entries.map(async (entry) => {
      if (entry.status !== 'pending') return entry
      entry.status = 'loading'

      const loadedEntry = await plugins.reduce(async (resultPromise, plugin) => {
        if (entry.status !== 'loading' || !plugin.load) return resultPromise
        const currentEntry = await resultPromise
        const returnedEntries = await plugin.load(currentEntry, options)
        let resultEntry = currentEntry
        returnedEntries.forEach((returnedEntry) => {
          if (returnedEntry.id === entry.id) {
            if (returnedEntry.status === 'loading') {
              returnedEntry.status = 'loaded'
            }
            spliceEntry(returnedEntry, true, false)
            resultEntry = returnedEntry
          } else {
            if (!returnedEntry.status) {
              returnedEntry.status = 'pending'
            }
            returnedEntry.parentId = entry.id
            spliceEntry(returnedEntry, true, entry.status !== 'loaded')
            gotNewEntries = true
          }
        })
        return resultEntry
      }, Promise.resolve(entry))

      if (loadedEntry.status !== 'loaded') {
        throw new Error(`Entry ${loadedEntry.id} could not be loaded by any plugin`)
      }
    })

    await Promise.all(promises)

    if (gotNewEntries) {
      await loadEntries()
    }
  }

  const mapEntries = async () => {
    let gotNewEntries = false

    const promises = entries.map(async (entry) => {
      if (entry.status !== 'loaded') return entry
      entry.status = 'mapping'

      const mappedEntry = await plugins.reduce(async (resultPromise, plugin) => {
        if (entry.status !== 'mapping' || !plugin.map) return resultPromise
        const resultEntry = await resultPromise
        const returnedEntries = await plugin.map(resultEntry, options)
        returnedEntries.forEach((returnedEntry) => {
          if (returnedEntry.id === entry.id) {
            spliceEntry(returnedEntry, true, false)
          } else {
            if (!returnedEntry.status) {
              returnedEntry.status = 'pending'
            }
            returnedEntry.parentId = entry.id
            spliceEntry(returnedEntry, true, entry.status !== 'loaded')
            gotNewEntries = true
          }
        })
        return resultEntry
      }, Promise.resolve(entry))

      if (mappedEntry.status === 'mapping') {
        mappedEntry.status = 'mapped'
      }
      spliceEntry(mappedEntry, true, false)
    })

    await Promise.all(promises)

    if (gotNewEntries) {
      await loadEntries()
      await mapEntries()
    }
  }

  const buildConfig = async () => {
    let configPromise = Promise.resolve(Object.create(null))

    const reducer = plugins.findLast((p) => p.reduce)
    if (reducer) {
      configPromise = entries.reduce((configPromise, entry) => {
        if (entry.status !== 'mapped') {
          throw new Error(`Attempting to reduce unmapped entry ${entry.id}`)
        }
        return configPromise.then((config) => reducer.reduce!(config, entry, options))
      }, configPromise)
    }

    configPromise = plugins.reduce((configPromise, plugin) => {
      if (!plugin.transform) return configPromise
      return configPromise.then((config) => plugin.transform!(config!, options))
    }, configPromise)

    const _config = await configPromise

    await Promise.all(
      plugins.map((plugin) => {
        return plugin.validate?.(_config, options)
      }),
    )

    config = _config
    watchCbs.forEach((cb) => cb(config))
  }

  const build = async () => {
    promise = promise.then(async () => {
      if (!entriesUpdated) return
      entriesUpdated = false
      await loadEntries()
      await mapEntries()
      if (entriesUpdated) {
        await buildConfig()
        entriesUpdated = false
      }
    })
    await promise
  }

  const instance: DozenInstance<TSources, TPlugins, TSchema> = {
    get() {
      return config as TSchema extends StandardSchemaV1
        ? StandardSchemaV1.InferOutput<TSchema>
        : object
    },

    async build() {
      await build()
      return instance.get()
    },

    add(items) {
      toFilteredArray(items)
        .flatMap((item) => {
          return typeof item === 'function' ? item(options) : rawSource(item)(options)
        })
        .forEach((entry) => {
          if (!entry.status) {
            entry.status = 'pending'
          }
          spliceEntry(entry, false, false)
        })
      if (watchCbs.size) {
        // TODO: handle errors
        build()
      }
      return instance
    },

    fork(forkOptions?) {
      const mergedOptions = {
        ...options,
        sources: [fork(instance), ...(forkOptions?.sources || [])],
        plugins: [forkLoader, ...(options.plugins || []), ...(forkOptions?.plugins || [])],
      }
      return dozen(mergedOptions)
    },

    watch(cb?) {
      cb ??= () => {}
      watchCbs.add(cb)
      if (watchCbs.size === 1) {
        plugins.forEach((plugin) => plugin.watch?.(watchCbForPlugins, options))
      }
      return () => instance.unwatch(cb)
    },

    unwatch(cb?) {
      if (cb) {
        watchCbs.delete(cb)
      } else {
        watchCbs.clear()
      }
      if (!watchCbs.size) {
        plugins.forEach((plugin) => plugin.unwatch?.(watchCbForPlugins, options))
      }
    },
  }

  instance.add(options.sources || [])

  return instance
}

export default dozen
export type { UnionToIntersection, ExtractOptions, DozenOptions, DozenInstance }
