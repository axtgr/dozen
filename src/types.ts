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

type Source = { name: string } & UnionOptional<
  { readSync: () => Entry[] } | { readAsync: () => Promise<Entry[]> }
>

type SourceFactory = (options: Options) => Source

type Loader = { name: string } & UnionOptional<
  | {
      loadSync: (entry: Entry) => undefined | Entry | (undefined | Entry)[]
      canLoadSync: (entry: Entry) => boolean
    }
  | {
      loadAsync: (entry: Entry) => Promise<undefined | Entry | (undefined | Entry)[]>
      canLoadAsync: (entry: Entry) => boolean
    }
>

type Mapper = { name: string } & UnionOptional<
  { mapSync: (entry: Entry) => Entry } | { mapAsync: (entry: Entry) => Promise<Entry> }
>

type Reducer = { name: string } & UnionOptional<
  | { reduceSync: (config: object, entry: Entry) => object }
  | { reduceAsync: (config: object, entry: Entry) => Promise<object> }
>

type Transformer = { name: string } & UnionOptional<
  | { transformSync: (config: object) => object }
  | { transformAsync: (config: object) => Promise<object> }
>

type Validator = { name: string } & UnionOptional<
  { validateSync: (config: object) => void } | { validateAsync: (config: object) => Promise<void> }
>

export type {
  Options,
  Entry,
  Source,
  SourceFactory,
  Loader,
  Mapper,
  Reducer,
  Transformer,
  Validator,
}
