import Path from 'node:path'
import type { Source } from '../types.ts'

interface ConfigFilesSourceOptions {
  name?: string
  cwd?: string
  projectRoot?: string
  configFiles?: {
    /**
     * Path to the directory until which to recursively look for config files from cwd.
     * When true, uses projectRoot; when false, looks only in cwd; when a string, uses that path.
     */
    lookUpUntil?: string | boolean
  }
}

/**
 * Provides config file paths as an entry.
 */
function configFiles(options?: ConfigFilesSourceOptions): Source<ConfigFilesSourceOptions> {
  return (_options) => {
    const name = options?.name || _options.name
    if (!name) return []

    const cwd = _options.cwd || process.cwd()
    const lookUpUntil = _options.configFiles?.lookUpUntil
    const stopAt =
      lookUpUntil === false
        ? cwd
        : typeof lookUpUntil === 'string'
          ? Path.resolve(lookUpUntil)
          : _options.projectRoot || cwd
    const stopAtRelative = Path.relative(cwd, stopAt)
    const pathSegments = ['.'].concat(stopAtRelative.split(Path.sep).filter(Boolean))

    let currentPath: string
    const entries = pathSegments.map((segment) => {
      currentPath = currentPath ? Path.join(currentPath, segment) : segment
      return {
        id: `configFiles:${currentPath}`,
        format: ['file'],
        value: [
          // The order is important here because it defines the priority of the files:
          // the first file to load will be the one used. However, these files are
          // loaded by two different loaders (jsLoader and fileLoader), and JS/TS files
          // will load before JSON ones no matter their position in the array, because
          // jsLoader comes before fileLoader.

          // LOADED BY jsLoader

          // Root dir
          Path.join(currentPath, `${name}.config.mts`),
          Path.join(currentPath, `${name}.config.cts`),
          Path.join(currentPath, `${name}.config.ts`),
          Path.join(currentPath, `${name}.config.mjs`),
          Path.join(currentPath, `${name}.config.cjs`),
          Path.join(currentPath, `${name}.config.js`),
          Path.join(currentPath, `.${name}rc.mjs`),
          Path.join(currentPath, `.${name}rc.cjs`),
          Path.join(currentPath, `.${name}rc.js`),

          // .name dir
          Path.join(currentPath, `.${name}/${name}.config.mts`),
          Path.join(currentPath, `.${name}/${name}.config.cts`),
          Path.join(currentPath, `.${name}/${name}.config.ts`),
          Path.join(currentPath, `.${name}/${name}.config.mjs`),
          Path.join(currentPath, `.${name}/${name}.config.cjs`),
          Path.join(currentPath, `.${name}/${name}.config.js`),
          Path.join(currentPath, `.${name}/${name}rc.mjs`),
          Path.join(currentPath, `.${name}/${name}rc.cjs`),
          Path.join(currentPath, `.${name}/${name}rc.js`),
          Path.join(currentPath, `.${name}/.${name}rc.mjs`),
          Path.join(currentPath, `.${name}/.${name}rc.cjs`),
          Path.join(currentPath, `.${name}/.${name}rc.js`),
          Path.join(currentPath, `.${name}/config.mts`),
          Path.join(currentPath, `.${name}/config.cts`),
          Path.join(currentPath, `.${name}/config.ts`),
          Path.join(currentPath, `.${name}/config.mjs`),
          Path.join(currentPath, `.${name}/config.cjs`),
          Path.join(currentPath, `.${name}/config.js`),

          // .config dir
          Path.join(currentPath, `.config/${name}.config.mts`),
          Path.join(currentPath, `.config/${name}.config.cts`),
          Path.join(currentPath, `.config/${name}.config.ts`),
          Path.join(currentPath, `.config/${name}.config.mjs`),
          Path.join(currentPath, `.config/${name}.config.cjs`),
          Path.join(currentPath, `.config/${name}.config.js`),
          Path.join(currentPath, `.config/${name}rc.mjs`),
          Path.join(currentPath, `.config/${name}rc.cjs`),
          Path.join(currentPath, `.config/${name}rc.js`),
          Path.join(currentPath, `.config/.${name}.mjs`),
          Path.join(currentPath, `.config/.${name}.cjs`),
          Path.join(currentPath, `.config/.${name}.js`),

          // LOADED BY fileLoader

          // Root dir
          Path.join(currentPath, `${name}.config.json`),
          Path.join(currentPath, `.${name}rc`),
          Path.join(currentPath, `.${name}rc.json`),

          // .name dir
          Path.join(currentPath, `.${name}/${name}.config.json`),
          Path.join(currentPath, `.${name}/${name}rc`),
          Path.join(currentPath, `.${name}/${name}rc.json`),
          Path.join(currentPath, `.${name}/.${name}rc.json`),
          Path.join(currentPath, `.${name}/config.json`),

          // .config dir
          Path.join(currentPath, `.config/${name}.config.json`),
          Path.join(currentPath, `.config/${name}rc`),
          Path.join(currentPath, `.config/${name}rc.json`),
          Path.join(currentPath, `.config/${name}.json`),
          Path.join(currentPath, `.config/.${name}rc`),
          Path.join(currentPath, `.config/.${name}rc.json`),
          Path.join(currentPath, `.config/.${name}.json`),
        ],
      }
    })

    // Files closest to cwd override files in parent directories
    return entries.toReversed()
  }
}

export default configFiles
export type { ConfigFilesSourceOptions }
