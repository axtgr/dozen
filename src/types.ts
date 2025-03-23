import type { UnionOptional } from './utils.ts'

interface Options {
  name: string
}

interface Entry {
  id: string
  source: Source
  value: unknown
  tags?: string[]
}

type Source<TOptions extends object = object> = { name: string } & UnionOptional<
  | { readSync: (options: TOptions) => Entry | Entry[] }
  | { readAsync: (options: TOptions) => Promise<Entry | Entry[]> }
>

type Loader<TOptions extends object = object> = { name: string } & UnionOptional<
  | {
      loadSync: (entry: Entry, options: TOptions) => undefined | Entry | (undefined | Entry)[]
      canLoadSync: (entry: Entry, options: TOptions) => boolean
    }
  | {
      loadAsync: (
        entry: Entry,
        options: TOptions,
      ) => Promise<undefined | Entry | (undefined | Entry)[]>
      canLoadAsync: (entry: Entry, options: TOptions) => boolean
    }
>

type Mapper<TOptions extends object = object> = { name: string } & UnionOptional<
  | { mapSync: (entry: Entry, options: TOptions) => Entry }
  | { mapAsync: (entry: Entry, options: TOptions) => Promise<Entry> }
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
