import type { UnionOptional } from './utils.ts'

interface Options {
  name: string
}

interface Entry {
  id: string
  parentId?: string
  value?: unknown
  loaded?: boolean
  tags?: string[]
}

type Source<TOptions extends object = object> = (options: TOptions) => Entry[]

interface Plugin<TOptions extends object = object> {
  name: string
  canLoadSync?: (entry: Entry, options: TOptions) => boolean
  loadSync?: (
    entry: Entry,
    options: TOptions,
  ) => undefined | null | false | Entry | (undefined | null | false | Entry)[]
  canLoadAsync?: (entry: Entry, options: TOptions) => Promise<boolean>
  loadAsync?: (
    entry: Entry,
    options: TOptions,
  ) => Promise<undefined | null | false | Entry | (undefined | null | false | Entry)[]>
  mapSync?: (
    entry: Entry,
    options: TOptions,
  ) => undefined | null | false | Entry | (undefined | null | false | Entry)[]
  mapAsync?: (
    entry: Entry,
    options: TOptions,
  ) => Promise<undefined | null | false | Entry | (undefined | null | false | Entry)[]>
  reduceSync?: (config: object, entry: Entry, options: TOptions) => object
  reduceAsync?: (config: object, entry: Entry, options: TOptions) => Promise<object>
  transformSync?: (config: object, options: TOptions) => object
  transformAsync?: (config: object, options: TOptions) => Promise<object>
  validateSync?: (config: object, options: TOptions) => void
  validateAsync?: (config: object, options: TOptions) => Promise<void>
}

export type { Options, Entry, Source, Plugin }
