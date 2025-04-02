import type { DozenInstance } from '../index.ts'
import type { Source } from '../types.ts'

type ForkSourceOptions = object

let id = 0

function fork(parentDozen: DozenInstance): Source {
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
