import type { Source } from '../types.ts'

interface FilesSourceOptions {
  name?: string
}

function files(): Source<FilesSourceOptions> {
  return (options) => {
    const { name } = options
    return [
      {
        id: 'files',
        tags: ['file'],
        value: [
          '.env',
          `.env.${process.env.NODE_ENV || 'development'}`,
          '.env.local',
          `.env.${process.env.NODE_ENV || 'development'}.local`,
          ...(name
            ? [
                'package.json',
                `.${name}rc`,
                `.${name}rc.json`,
                `.${name}rc.yaml`,
                `.${name}rc.yml`,
                `.${name}rc.js`,
                `.${name}rc.ts`,
                `.${name}rc.mjs`,
                `.${name}rc.cjs`,
                `.config/${name}rc`,
                `.config/${name}rc.json`,
                `.config/${name}rc.yaml`,
                `.config/${name}rc.yml`,
                `.config/${name}rc.js`,
                `.config/${name}rc.ts`,
                `.config/${name}rc.mjs`,
                `.config/${name}rc.cjs`,
                `${name}.config.js`,
                `${name}.config.ts`,
                `${name}.config.mjs`,
                `${name}.config.cjs`,
              ]
            : []),
        ],
      },
    ]
  }
}

export default files
