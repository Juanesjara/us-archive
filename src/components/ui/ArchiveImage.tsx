import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { getBlob, ref } from 'firebase/storage'
import { getFirebaseStorage } from '../../lib/firebase'

/*
 * Images live in Cloud Storage as images/{id}/full.jpg and thumb.jpg. They are
 * fetched with getBlob, not getDownloadURL: download URLs are public to anyone
 * who has the link, while getBlob checks the Storage rules on every request.
 *
 * Images never change after upload (replacing a photo creates a new id), so the
 * object URLs are cached at module level. Thumbnails stay; full photos are a
 * few MB each, so only the most recent ones are kept.
 */
export type ImageSize = 'full' | 'thumb'

export const imageRef = (id: string, size: ImageSize) => ref(getFirebaseStorage(), `images/${id}/${size}.jpg`)

const MAX_FULL = 8
const cache = new Map<string, Promise<string | null>>()

function evictFull() {
  const full = [...cache.keys()].filter((k) => k.endsWith('/full'))
  for (const key of full.slice(0, Math.max(0, full.length - MAX_FULL))) drop(key)
}

function drop(key: string) {
  const pending = cache.get(key)
  cache.delete(key)
  void pending?.then((url) => url && URL.revokeObjectURL(url))
}

export function loadImage(id: string, size: ImageSize = 'full'): Promise<string | null> {
  const key = `${id}/${size}`
  let pending = cache.get(key)
  if (pending) {
    // Re-insert so the photo counts as recently used.
    cache.delete(key)
  } else {
    pending = getBlob(imageRef(id, size))
      .then((blob) => URL.createObjectURL(blob))
      .catch(() => {
        cache.delete(key)
        return null
      })
  }
  cache.set(key, pending)
  if (size === 'full') evictFull()
  return pending
}

export function forgetImage(id: string) {
  drop(`${id}/full`)
  drop(`${id}/thumb`)
}

/** Resolves an image id to a displayable URL. undefined while loading. */
export function useImage(id: string | null | undefined, size: ImageSize = 'full'): string | null | undefined {
  const [state, setState] = useState<{ key: string | null; url: string | null | undefined }>({
    key: null,
    url: undefined,
  })
  const key = id ? `${id}/${size}` : null

  useEffect(() => {
    if (!id || !key) return
    let alive = true
    void loadImage(id, size).then((url) => {
      if (alive) setState({ key, url })
    })
    return () => {
      alive = false
    }
  }, [id, size, key])

  if (!id) return null
  return state.key === key ? state.url : undefined
}

interface ArchiveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  id: string
  size?: ImageSize
  /** Aspect ratio placeholder while loading, e.g. "4 / 5". */
  ratio?: string
}

export function ArchiveImage({ id, size = 'full', ratio, className = '', alt = '', ...rest }: ArchiveImageProps) {
  const url = useImage(id, size)
  if (!url) {
    return (
      <div
        aria-hidden="true"
        className={`bg-well ${className}`}
        style={{ aspectRatio: ratio ?? '4 / 5', ...(rest.style ?? {}) }}
      />
    )
  }
  return <img src={url} alt={alt} className={`bg-well ${className}`} {...rest} />
}
