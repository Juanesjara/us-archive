import { useEffect } from 'react'
import type { Photo } from '../../types'
import { formatFull } from '../../lib/format'
import { ArchiveImage } from './ArchiveImage'

interface LightboxProps {
  photos: Photo[]
  index: number
  onClose: () => void
  onIndex: (next: number) => void
}

export function Lightbox({ photos, index, onClose, onIndex }: LightboxProps) {
  const photo = photos[index]
  const hasPrev = index > 0
  const hasNext = index < photos.length - 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onIndex(index - 1)
      if (e.key === 'ArrowRight' && hasNext) onIndex(index + 1)
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [index, hasPrev, hasNext, onClose, onIndex])

  if (!photo) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || 'Foto'}
      className="fixed inset-0 z-50 flex flex-col bg-paper"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-6 py-5 sm:px-10">
        <p className="text-meta text-muted">
          {index + 1} de {photos.length}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-ui text-ink hover:text-muted"
          aria-label="Cerrar"
        >
          Cerrar
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-6 sm:px-10" onClick={(e) => e.stopPropagation()}>
        <ArchiveImage
          key={photo.imageId}
          id={photo.imageId}
          alt={photo.caption || ''}
          className="max-h-full max-w-full object-contain"
        />
      </div>

      <div
        className="flex items-end justify-between gap-6 px-6 py-6 sm:px-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          {photo.caption ? <p className="serif text-prose text-ink">{photo.caption}</p> : null}
          <p className="text-meta text-muted">
            {formatFull(photo.date)}
            {photo.location ? `, ${photo.location}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 gap-5 text-ui">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => onIndex(index - 1)}
            className="text-ink hover:text-muted disabled:text-rule"
            aria-label="Foto anterior"
          >
            ←
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => onIndex(index + 1)}
            className="text-ink hover:text-muted disabled:text-rule"
            aria-label="Foto siguiente"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
