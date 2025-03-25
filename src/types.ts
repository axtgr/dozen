import type { UnionOptional } from './utils.ts'

interface Options {
  name: string
}

interface Entry {
  id: string
  parentId: string
  value: unknown
  loaded?: boolean
  tags?: string[]
}

type Source<TOptions extends object = object> = (options: TOptions) => Entry[]

type Loader<TOptions extends object = object> = { name: string } & UnionOptional<
  | {
      canLoadSync: (entry: Entry, options: TOptions) => boolean
      loadSync: (
        entry: Entry,
        options: TOptions,
      ) => undefined | null | false | Entry | (undefined | null | false | Entry)[]
    }
  | {
      canLoadAsync: (entry: Entry, options: TOptions) => boolean
      loadAsync: (
        entry: Entry,
        options: TOptions,
      ) => Promise<undefined | null | false | Entry | (undefined | null | false | Entry)[]>
    }
>

type Mapper<TOptions extends object = object> = { name: string } & UnionOptional<
  | {
      mapSync: (
        entry: Entry,
        options: TOptions,
      ) => undefined | null | false | Entry | (undefined | null | false | Entry)[]
    }
  | {
      mapAsync: (
        entry: Entry,
        options: TOptions,
      ) => Promise<undefined | null | false | Entry | (undefined | null | false | Entry)[]>
    }
>

type Reducer<TOptions extends object = object> = { name: string } & UnionOptional<
  | { reduceSync: (config: object, entry: Entry, options: TOptions) => object }
  | { reduceAsync: (config: object, entry: Entry, options: TOptions) => Promise<object> }
>

type Transformer<TOptions extends object = object> = { name: string } & UnionOptional<
  | { transformSync: (config: object, options: TOptions) => object }
  | { transformAsync: (config: object, options: TOptions) => Promise<object> }
>

type Validator<TOptions extends object = object> = { name: string } & UnionOptional<
  | { validateSync: (config: object, options: TOptions) => void }
  | { validateAsync: (config: object, options: TOptions) => Promise<void> }
>

export type { Options, Entry, Source, Loader, Mapper, Reducer, Transformer, Validator }
