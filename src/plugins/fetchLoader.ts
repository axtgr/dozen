import mime from 'mime'
import type { PluginFactory } from '../types.ts'

type FetchLoaderOptions = object

const fetchLoader: PluginFactory<FetchLoaderOptions> = () => {
  return {
    name: 'default:fetchLoader',
    load: async (entry) => {
      if (
        !entry.format?.includes('url') ||
        !(entry.value instanceof URL) ||
        !['http:', 'https:'].includes(entry.value.protocol)
      ) {
        return
      }

      const response = await fetch(entry.value)

      if (!response.ok) {
        throw new Error(`Dozen: fetchLoader: HTTP error ${response.status} for ${entry.id}`)
      }

      entry.value = {}

      const newEntry = {
        id: `fetched:${entry.id}`,
        format: entry.format.filter((f) => f !== 'url'),
        value: await response.text(),
      }

      const contentType = response.headers.get('content-type')
      const extension = mime.getExtension(contentType || '')

      if (extension && extension !== 'txt' && !entry.format.includes(extension)) {
        newEntry.format.push(extension)
      }

      return [entry, newEntry]
    },
  }
}

export default fetchLoader
export type { FetchLoaderOptions }
