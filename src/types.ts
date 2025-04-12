interface Entry {
  id: string
  parentId?: string
  value?: unknown
  format?: string[]
  status?: 'pending' | 'loading' | 'loaded' | 'mapping' | 'mapped'
  meta?: Record<string, unknown>
}

type Source<TOptions extends object = object> = (options: TOptions) => Entry[]

type PluginWatchCb = (err?: unknown, entry?: Entry) => void

interface Plugin<TOptions extends object = object> {
  name: string
  load?: (
    entry: Entry,
    options: TOptions,
  ) => Promise<undefined | null | false | Entry | (undefined | null | false | Entry)[]>
  map?: (
    entry: Entry,
    options: TOptions,
  ) => Promise<undefined | null | false | Entry | (undefined | null | false | Entry)[]>
  reduce?: (config: object, entry: Entry, options: TOptions) => Promise<object>
  transform?: (config: object, options: TOptions) => Promise<object>
  validate?: (config: object, options: TOptions) => Promise<void>
  watch?: (cb: PluginWatchCb, options: TOptions) => Promise<void>
  unwatch?: (cb: PluginWatchCb, options: TOptions) => Promise<void>
}

type PluginFactory<TOptions extends object = object> = (options: TOptions) => Plugin<TOptions>

export type { Entry, Source, PluginWatchCb, Plugin, PluginFactory }
