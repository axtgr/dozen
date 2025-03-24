import type { KeysOfUnion, Simplify } from 'type-fest'

type UnionOptionalInner<
  BaseType extends object,
  EveryKey extends KeysOfUnion<BaseType> = KeysOfUnion<BaseType>,
> = Simplify<
  // 1. For each member of the union (Note: `T extends any` is distributive)
  BaseType extends object
    ? // 2. Preserve the original type
      BaseType & { [K in Exclude<EveryKey, keyof BaseType>]?: undefined } // 3. And map other keys to `{ key?: undefined }`
    : never
>

/**
 * Preserves the union, but makes "Property does not exist on type" errors go away
 * by marking them as `{ key?: undefined }`
 *
 * @see https://x.com/buildsghost/status/1843513210001138076
 */
type UnionOptional<BaseType extends object> = UnionOptionalInner<BaseType>

function isObject<T extends object>(value: T | null | undefined | false): value is T {
  return typeof value === 'object' && value !== null
}

function toFilteredArray<T extends object>(
  processors: T | undefined | null | false | (T | undefined | null | false)[],
): T[] {
  return Array.isArray(processors) ? processors.filter(isObject) : processors ? [processors] : []
}

export { isObject, toFilteredArray }
export type { UnionOptional }
