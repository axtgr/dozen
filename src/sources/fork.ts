import type { DozenInstance } from '../index.ts'
import type { Source } from '../types.ts'

type ForkSourceOptions = object

let id = 0

/**
 * Provides a reference to the parent Dozen instance as an entry.
 */
function fork(parentDozen: DozenInstance<any, any>): Source {
  return () => [
    {
      id: `fork-${id++}`,
      format: ['fork'],
      value: parentDozen,
    },
  ]
}

export default fork
export type { ForkSourceOptions }
