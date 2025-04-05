import type { Source } from '../types.ts'

type RawSourceOptions = object

let id = 0

/**
 * Provides a raw value as an entry.
 */
function raw(value: unknown): Source {
  const values = Array.isArray(value) ? value : [value]
  const entries = values.map((value) => {
    return {
      id: `raw-${id++}`,
      status: 'loaded',
      value,
    } as const
  })
  return () => entries
}

export default raw
export type { RawSourceOptions }
