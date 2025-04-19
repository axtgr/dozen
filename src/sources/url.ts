import type { Source } from '../types.ts'

type UrlSourceOptions = object

/**
 * Provides a URL as an entry.
 */
function url(url: string | URL, format?: string): Source {
  const urlObject = typeof url === 'string' ? new URL(url) : url
  return () => [
    {
      id: `url-${url}`,
      format: ['url', ...(format ? [format] : [])],
      value: urlObject,
    },
  ]
}

export default url
export type { UrlSourceOptions }
