import type Dozen from '../index.ts'
import type { Source } from '../types.ts'

type ForkSourceOptions = object

let id = 0

function fork(parentDozen: ReturnType<typeof Dozen>): Source {
  return () => [
    {
      id: `fork-${id++}`,
      tags: ['fork'],
      value: parentDozen,
    },
  ]
}

export default fork
export type { ForkSourceOptions }
