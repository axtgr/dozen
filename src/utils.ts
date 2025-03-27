import * as textCase from 'text-case'
import type { KeysOfUnion, Simplify } from 'type-fest'

type UnionOptionalInner<
  BaseType extends object,
  EveryKey extends KeysOfUnion<BaseType> = KeysOfUnion<BaseType>,
> = Simplify<
  // 1. For each member of the union (Note: `T extends any` is distributive)
  BaseType extends object
    ? // 2. Preserve the original type
      BaseType & { [K in Exclude<EveryKey, keyof BaseType>]?: unknown } // 3. And map other keys to `{ key?: unknown }`
    : never
>

/**
 * Preserves the union, but makes "Property does not exist on type" errors go away
 * by marking them as `{ key?: unknown }`
 *
 * Based on https://x.com/buildsghost/status/1843513210001138076, but uses `unknown` instead of `undefined`
 */
type UnionOptional<BaseType extends object> = UnionOptionalInner<BaseType>

function isObjectOrFunction<T extends object>(value: T | null | undefined | false): value is T {
  return typeof value === 'function' || (typeof value === 'object' && value !== null)
}

function toFilteredArray<T extends object>(
  values: T | undefined | null | false | (T | undefined | null | false)[],
): T[] {
  return Array.isArray(values) ? values.filter(isObjectOrFunction) : values ? [values] : []
}

const stringCases = {
  camel: (input: string) => {
    return textCase.camelCase(input, { transform: textCase.camelCaseTransformMerge })
  },
  pascal: (input: string) => {
    return textCase.pascalCase(input, { transform: textCase.pascalCaseTransformMerge })
  },
  kebab: (input: string) => textCase.paramCase(input),
  snake: (input: string) => textCase.snakeCase(input),
  constant: (input: string) => textCase.constantCase(input),
  upper: (input: string) => textCase.upperCase(input),
  upperFirst: (input: string) => textCase.upperCaseFirst(input),
  lower: (input: string) => textCase.lowerCase(input),
  lowerFirst: (input: string) => textCase.lowerCaseFirst(input),
  swap: (input: string) => textCase.swapCase(input),
  capital: (input: string) => textCase.capitalCase(input),
  dot: (input: string) => textCase.dotCase(input),
  none: (input: string) => textCase.noCase(input),
  path: (input: string) => textCase.pathCase(input),
  title: (input: string) => textCase.titleCase(input),
}

export { isObjectOrFunction as isObject, toFilteredArray, stringCases }
export type { UnionOptional }
