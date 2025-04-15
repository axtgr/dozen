import type { Source } from '../types.ts'

type RawSourceOptions = object

let id = 0

/**
 * Provides a raw value as an entry.
 */
function raw(value: object): Source {
  const values = Array.isArray(value) ? value : [value]
  const entries = values.map((value) => {
    if (!value || typeof value !== 'object') {
      throw new Error(
        `Value given to raw source must be an object, ${value ? typeof value : 'null'} given`,
      )
    }
    return {
      id: `raw-${id++}`,
      format: ['object'],
      value,
    }
  })
  return () => entries
}

export default raw
export type { RawSourceOptions }
