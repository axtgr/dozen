import type { Source } from '../types.ts'

type DotenvSourceOptions = object

/**
 * Provides dotenv file paths as an entry.
 */
function dotenv(): Source {
  return () => {
    return [
      {
        id: 'dotenv',
        format: ['file'],
        value: [
          `.env.${process.env.NODE_ENV || 'development'}.local`,
          `.env.${process.env.NODE_ENV || 'development'}`,
          '.env.local',
          '.env',
        ],
      },
    ]
  }
}

export default dotenv
export type { DotenvSourceOptions }
