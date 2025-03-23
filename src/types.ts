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

type EntryTransformer = { name: string } & UnionOptional<
  { transformSync: (entry: Entry) => Entry } | { transformAsync: (entry: Entry) => Promise<Entry> }
>

type Merger = { name: string } & UnionOptional<
  | { mergeSync: (config: object, entry: Entry) => object }
  | { mergeAsync: (config: object, entry: Entry) => Promise<object> }
>

type ConfigTransformer = { name: string } & UnionOptional<
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
  EntryTransformer,
  Merger,
  ConfigTransformer,
  Validator,
}
