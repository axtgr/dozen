import type { StandardSchemaV1 } from '@standard-schema/spec'
import EntryStore from './EntryStore.ts'
import forkLoader from './plugins/forkLoader.ts'
import fork from './sources/fork.ts'
import rawSource from './sources/raw.ts'
import type { Entry, Plugin, PluginFactory, PluginWatchCb, Source } from './types.ts'
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

type WatchCb = (config: object) => void
type CatchCb = (err: unknown) => void

/**
 * A controller responsible for the watching of changes in Dozen.
 */
interface Watcher {
  /** Start watching for changes with the callback provided when the watcher was created */
  start(): Watcher
  /** Stop watching for changes */
  stop(): Watcher
  /** Catch errors thrown either in non-manual builds or inside the watcher callback */
  catch(cb?: CatchCb): Watcher
}

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
   * Builds the config object (if needed) and returns it.
   *
   * If there have been changes in the sources since the last build, the corresponding
   * sources (and only them) will be loaded and mapped, and the config object will be rebuilt,
   * otherwise the cached config object will be returned.
   */
  build(): Promise<
    TSchema extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<TSchema> : object
  >

  /**
   * Adds one or more sources or values to the pipeline. Falsy values are ignored.
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
   * build() on the parent instance, then build on top of it.
   *
   * Forks currently don't support watching.
   */
  fork(
    forkOptions?: DozenOptions<TSources, TPlugins, TSchema>,
  ): DozenInstance<TSources, TPlugins, TSchema>

  /**
   * Starts watching for changes in sources and rebuilds the config object so that
   * get() always returns the up-to-date config. If a callback is provided,
   * it will be called with the updated config.
   *
   * @returns A watcher object that can be used to control the watching and catch errors.
   */
  watch(cb?: WatchCb): Watcher

  /**
   * Stops watching for changes. If a callback is provided, only the corresponding
   * watcher will be stopped, otherwise stops all watchers.
   */
  unwatch(cb?: WatchCb): void
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

  const entryStore = new EntryStore()
  let config: object = {}
  let promise = Promise.resolve()

  const watchCbs = new Set<WatchCb>()
  const catchCbs = new Map<WatchCb, CatchCb>()

  /** Callback provided to the watch() method of plugins */
  const pluginWatchCb: PluginWatchCb = (err, entry, parentEntry) => {
    console.log()
    console.log('WATCH', parentEntry?.id)
    console.log(entry, parentEntry?.id)
    if (err) {
      handleWatchError(err)
    } else if (entry) {
      entryStore.updateEntry(entry, parentEntry?.id, 'pending', true, false)
      console.log('UPDATED')
      console.log(entryStore.getEntries())
      build().catch(handleWatchError)
    }
  }

  /**
   * Handles errors thrown either by non-manual builds or by plugins watching for changes.
   * Isn't used to handle errors in watcher callbacks themselves.
   **/
  const handleWatchError = (err: unknown) => {
    if (catchCbs.size) {
      catchCbs.forEach((catchCb) => catchCb(err))
    } else {
      console.error(
        'Dozen: an error occurred while watching, and no catch handler is defined, so the error was ignored. Assign catch handlers to watchers to handle errors',
      )
      console.error(err)
    }
  }

  /** Triggers all watcher callbacks with the current config and handles errors that occur in them */
  const triggerWatchCbs = () => {
    watchCbs.forEach(async (cb) => {
      try {
        await cb(config)
      } catch (err) {
        const catchCb = catchCbs.get(cb)
        if (catchCb) {
          catchCb(err)
        } else {
          console.error(
            'Dozen: an error occurred inside a watch handler, and no corresponding catch handler is defined, so the error was ignored. Assign a catch handler to the watcher to handle errors',
          )
          console.error(err)
        }
      }
    })
  }

  const loadEntries = async () => {
    const promises = entryStore.getEntries('pending').map(async (entry) => {
      entryStore.setEntryStatus(entry.id, 'loading')

      for (const plugin of plugins) {
        if (!plugin.load || entryStore.getEntryStatus(entry.id) !== 'loading') continue

        const returnedEntries = await plugin.load(entry, options)
        let putBeforeParent = true
        let originalEntryReturned = false

        for (const returnedEntry of returnedEntries) {
          const isOriginalEntry = returnedEntry.id === entry.id
          const entryRemoved = !entryStore.updateEntry(
            returnedEntry,
            isOriginalEntry ? undefined : entry.id,
            isOriginalEntry ? 'loaded' : 'pending',
            true,
            putBeforeParent,
          )

          if (isOriginalEntry) {
            // If the original entry is removed, we immediately stop loading it.
            if (entryRemoved) return
            // If the original entry is returned, it means it has been loaded,
            // and we have to stop loading it, but we need to check the rest
            // of the array for other children, so we don't return immediately.
            originalEntryReturned = true
            putBeforeParent = false
          }
        }

        if (originalEntryReturned) {
          return
        } else if (returnedEntries.length) {
          throw new Error(
            `Plugin ${plugin.name} returned some entries from load(), but the original entry wasn't among them. When load() returns something, it must be either the original entry or an array containing it`,
          )
        }
      }

      throw new Error(
        `The following entry could not be loaded by any plugin:\n${JSON.stringify(entry, null, 2)}`,
      )
    })

    await Promise.all(promises)

    if (entryStore.countEntries('pending')) {
      await loadEntries()
    }
  }

  const mapEntries = async () => {
    const promises = entryStore.getEntries('loaded').map(async (entry) => {
      if (typeof entry.value !== 'object' || !entry.value) {
        // console.log(entry)
        throw new Error(
          `The following entry is supposed to be already loaded, but its value is not an object:\n${JSON.stringify(
            entry,
            null,
            2,
          )}`,
        )
      }

      entryStore.setEntryStatus(entry.id, 'mapping')

      for (const plugin of plugins) {
        if (!plugin.map || entryStore.getEntryStatus(entry.id) !== 'mapping') continue

        const returnedEntries = await plugin.map(entry, options)
        let putBeforeParent = true
        let originalEntryReturned = false

        for (const returnedEntry of returnedEntries) {
          const isOriginalEntry = returnedEntry.id === entry.id
          const entryRemoved = !entryStore.updateEntry(
            returnedEntry,
            isOriginalEntry ? undefined : entry.id,
            isOriginalEntry ? 'mapping' : 'pending',
            true,
            putBeforeParent,
          )

          if (isOriginalEntry) {
            // If the original entry is removed, we immediately stop mapping it.
            if (entryRemoved) return
            originalEntryReturned = true
            putBeforeParent = false
          }
        }

        if (!originalEntryReturned) {
          throw new Error(`Plugin ${plugin.name} didn't return entry ${entry.id} while mapping`)
        }
      }

      entryStore.setEntryStatus(entry.id, 'mapped')
    })

    await Promise.all(promises)

    if (entryStore.countEntries('pending')) {
      await loadEntries()
    }

    if (entryStore.countEntries('loaded')) {
      await mapEntries()
    }
  }

  const buildConfig = async () => {
    let configPromise = Promise.resolve(Object.create(null))

    const reducer = plugins.findLast((p) => p.reduce)
    if (reducer) {
      configPromise = entryStore.getEntries('mapped').reduce((configPromise, entry) => {
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
  }

  /** Invokes the whole processing pipeline */
  const build = async () => {
    // "promise" is used every time a build is triggered, and it shouldn't be rejected
    // with prior errors.
    // "buildPromise" is for this particular build, and it keeps the error.
    const buildPromise = promise.then(async () => {
      if (!entryStore.hasUpdates()) return
      entryStore.clearUpdates()
      if (entryStore.countEntries('pending')) await loadEntries()
      if (entryStore.countEntries('loaded')) await mapEntries()
      if (!entryStore.hasUpdates()) return
      await buildConfig()
      entryStore.clearUpdates()
      triggerWatchCbs()
    })
    promise = buildPromise.catch(() => {})
    await buildPromise
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
        .forEach((entry: Entry) => {
          entryStore.updateEntry(entry, undefined, 'pending', false, false)
        })
      if (watchCbs.size) {
        build().catch(handleWatchError)
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
      const watcher: Watcher = {
        start: () => {
          if (watchCbs.has(cb)) return watcher
          watchCbs.add(cb)
          if (watchCbs.size === 1) {
            plugins.forEach((plugin) => plugin.watch?.(pluginWatchCb, options))
          }
          return watcher
        },
        stop: () => {
          instance.unwatch(cb)
          return watcher
        },
        catch: (catchCb) => {
          catchCbs.set(cb, catchCb || (() => {}))
          return watcher
        },
      }
      watcher.start()
      return watcher
    },

    unwatch(cb?) {
      if (cb) {
        watchCbs.delete(cb)
        catchCbs.delete(cb)
      } else {
        watchCbs.clear()
        catchCbs.clear()
      }
      if (!watchCbs.size) {
        plugins.forEach((plugin) => plugin.unwatch?.(pluginWatchCb, options))
      }
    },
  }

  instance.add(options.sources || [])

  return instance
}

export default dozen
export type { UnionToIntersection, ExtractOptions, DozenOptions, DozenInstance }
