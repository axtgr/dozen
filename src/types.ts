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

type ConfigTransformer = { name: string } & UnionOptional<
  | { transformSync: (config: object) => object }
  | { transformAsync: (config: object) => Promise<object> }
>

export type { Options, Source, SourceFactory, Loader, EntryTransformer, ConfigTransformer, Entry }
