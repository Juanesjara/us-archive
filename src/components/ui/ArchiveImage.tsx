import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { getDb } from '../../lib/firebase'
import type { StoredImage } from '../../types'

/*
 * Images live in images/{id} as JPEG data URLs. They never change after
 * upload (replacing a photo creates a new id), so a module-level cache is
 * safe and keeps navigation between sections instant.
 */
const cache = new Map<string, Promise<string | null>>()

export function loadImage(id: string): Promise<string | null> {
  let pending = cache.get(id)
  if (!pending) {
    pending = getDoc(doc(getDb(), 'images', id))
      .then((snap) => (snap.exists() ? (snap.data() as StoredImage).data : null))
      .catch(() => {
        cache.delete(id)
        return null
      })
    cache.set(id, pending)
  }
  return pending
}

export function forgetImage(id: string) {
  cache.delete(id)
}

/** Resolves an image id to a displayable data URL. undefined while loading. */
export function useImage(id: string | null | undefined): string | null | undefined {
  const [state, setState] = useState<{ id: string | null | undefined; url: string | null | undefined }>({
    id,
    url: undefined,
  })

  useEffect(() => {
    if (!id) return
    let alive = true
    void loadImage(id).then((url) => {
      if (alive) setState({ id, url })
    })
    return () => {
      alive = false
    }
  }, [id])

  if (!id) return null
  return state.id === id ? state.url : undefined
}

interface ArchiveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  id: string
  /** Aspect ratio placeholder while loading, e.g. "4 / 5". */
  ratio?: string
}

export function ArchiveImage({ id, ratio, className = '', alt = '', ...rest }: ArchiveImageProps) {
  const url = useImage(id)
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
