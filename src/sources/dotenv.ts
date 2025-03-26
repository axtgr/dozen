import type { Source } from '../types.ts'

function dotenv(): Source {
  return () => {
    return [
      {
        id: 'dotenv',
        tags: ['file', 'env'],
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
