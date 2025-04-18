import Path from 'node:path'
import { findUpFromCwd } from '../fileUtils.ts'
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

    const lookUpUntil = _options.configFiles?.lookUpUntil
    return findUpFromCwd(
      (path) => {
        return {
          id: `configFiles:${path}`,
          format: ['file'],
          value: [
            // The order is important here because it defines the priority of the files:
            // the first file to load will be the one used. However, these files are
            // loaded by two different loaders (jsLoader and fileLoader), and JS/TS files
            // will load before JSON ones no matter their position in the array, because
            // jsLoader comes before fileLoader.

            // LOADED BY jsLoader

            // Root dir
            Path.join(path, `${name}.config.mts`),
            Path.join(path, `${name}.config.cts`),
            Path.join(path, `${name}.config.ts`),
            Path.join(path, `${name}.config.mjs`),
            Path.join(path, `${name}.config.cjs`),
            Path.join(path, `${name}.config.js`),
            Path.join(path, `.${name}rc.mjs`),
            Path.join(path, `.${name}rc.cjs`),
            Path.join(path, `.${name}rc.js`),

            // .name dir
            Path.join(path, `.${name}/${name}.config.mts`),
            Path.join(path, `.${name}/${name}.config.cts`),
            Path.join(path, `.${name}/${name}.config.ts`),
            Path.join(path, `.${name}/${name}.config.mjs`),
            Path.join(path, `.${name}/${name}.config.cjs`),
            Path.join(path, `.${name}/${name}.config.js`),
            Path.join(path, `.${name}/${name}rc.mjs`),
            Path.join(path, `.${name}/${name}rc.cjs`),
            Path.join(path, `.${name}/${name}rc.js`),
            Path.join(path, `.${name}/.${name}rc.mjs`),
            Path.join(path, `.${name}/.${name}rc.cjs`),
            Path.join(path, `.${name}/.${name}rc.js`),
            Path.join(path, `.${name}/config.mts`),
            Path.join(path, `.${name}/config.cts`),
            Path.join(path, `.${name}/config.ts`),
            Path.join(path, `.${name}/config.mjs`),
            Path.join(path, `.${name}/config.cjs`),
            Path.join(path, `.${name}/config.js`),

            // .config dir
            Path.join(path, `.config/${name}.config.mts`),
            Path.join(path, `.config/${name}.config.cts`),
            Path.join(path, `.config/${name}.config.ts`),
            Path.join(path, `.config/${name}.config.mjs`),
            Path.join(path, `.config/${name}.config.cjs`),
            Path.join(path, `.config/${name}.config.js`),
            Path.join(path, `.config/${name}rc.mjs`),
            Path.join(path, `.config/${name}rc.cjs`),
            Path.join(path, `.config/${name}rc.js`),
            Path.join(path, `.config/.${name}.mjs`),
            Path.join(path, `.config/.${name}.cjs`),
            Path.join(path, `.config/.${name}.js`),

            // LOADED BY fileLoader

            // Root dir
            Path.join(path, `${name}.config.json`),
            Path.join(path, `.${name}rc`),
            Path.join(path, `.${name}rc.json`),

            // .name dir
            Path.join(path, `.${name}/${name}.config.json`),
            Path.join(path, `.${name}/${name}rc`),
            Path.join(path, `.${name}/${name}rc.json`),
            Path.join(path, `.${name}/.${name}rc.json`),
            Path.join(path, `.${name}/config.json`),

            // .config dir
            Path.join(path, `.config/${name}.config.json`),
            Path.join(path, `.config/${name}rc`),
            Path.join(path, `.config/${name}rc.json`),
            Path.join(path, `.config/${name}.json`),
            Path.join(path, `.config/.${name}rc`),
            Path.join(path, `.config/.${name}rc.json`),
            Path.join(path, `.config/.${name}.json`),
          ],
        }
      },
      _options,
      lookUpUntil,
    )
  }
}

export default configFiles
export type { ConfigFilesSourceOptions }
