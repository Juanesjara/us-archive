import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Photo } from '../../types'
import { formatFull, formatTime } from '../../lib/format'
import { setPhotoCaption } from '../../services/archive'
import { loadImage, useImage } from './ArchiveImage'

interface LightboxProps {
  photos: Photo[]
  index: number
  onClose: () => void
  onIndex: (next: number) => void
}

function CaptionEditor({ photo, onDone }: { photo: Photo; onDone: () => void }) {
  const [value, setValue] = useState(photo.caption ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await setPhotoCaption(photo.id, value)
      onDone()
    } catch {
      setError('No se pudo guardar. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-3">
      <label className="sr-only" htmlFor="caption">
        Descripción
      </label>
      <input
        id="caption"
        className="field serif text-prose"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Escribe una descripción"
        maxLength={200}
        autoFocus
      />
      {error ? (
        <p className="text-meta text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex gap-5 text-meta">
        <button type="submit" disabled={busy} className="text-ink hover:text-muted disabled:opacity-40">
          {busy ? 'Guardando' : 'Guardar'}
        </button>
        <button type="button" onClick={onDone} disabled={busy} className="text-muted hover:text-ink">
          Cancelar
        </button>
      </div>
    </form>
  )
}

export function Lightbox({ photos, index, onClose, onIndex }: LightboxProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const photo = photos[index]
  const hasPrev = index > 0
  const hasNext = index < photos.length - 1
  const editing = editingId === photo?.id

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Arrow keys move the cursor while typing a description, not the photo.
      if (e.target instanceof HTMLInputElement) {
        if (e.key === 'Escape') setEditingId(null)
        return
      }
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

  // Warm up the neighbours so swiping through an album doesn't wait on each photo.
  useEffect(() => {
    for (const n of [index - 1, index + 1]) {
      const id = photos[n]?.imageId
      if (id) void loadImage(id)
    }
  }, [index, photos])

  if (!photo) return null

  const when = photo.hasTime ? `${formatFull(photo.date)}, ${formatTime(photo.date)}` : formatFull(photo.date)

  // Rendered into <body> so no ancestor (animations, transforms, overflow) can
  // shift or clip it. Three rows: top bar, photo filling what is left, details.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || 'Foto'}
      className="fixed inset-0 z-50 grid h-dvh grid-rows-[auto_minmax(0,1fr)_auto] bg-paper"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-6 pb-3 pt-5 sm:px-10">
        <p className="text-meta text-muted">
          {index + 1} de {photos.length}
        </p>
        <button type="button" onClick={onClose} className="text-ui text-ink hover:text-muted" aria-label="Cerrar">
          Cerrar
        </button>
      </div>

      <div className="relative mx-6 sm:mx-10" onClick={(e) => e.stopPropagation()}>
        <LightboxImage key={photo.imageId} id={photo.imageId} alt={photo.caption || ''} />
      </div>

      <div
        className="flex items-end justify-between gap-6 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 flex-1">
          {editing ? (
            <CaptionEditor key={photo.id} photo={photo} onDone={() => setEditingId(null)} />
          ) : (
            <>
              {photo.caption ? <p className="serif text-prose text-ink">{photo.caption}</p> : null}
              <p className="text-meta text-muted">{when}</p>
              {photo.location ? <p className="text-meta text-muted">{photo.location}</p> : null}
              <button
                type="button"
                onClick={() => setEditingId(photo.id)}
                className="mt-2 text-meta text-ink hover:text-muted"
              >
                {photo.caption ? 'Editar descripción' : 'Añadir descripción'}
              </button>
            </>
          )}
        </div>
        {editing ? null : (
          <div className="flex shrink-0 gap-5 text-ui">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={() => onIndex(index - 1)}
              className="px-1 py-2 text-ink hover:text-muted disabled:text-rule"
              aria-label="Foto anterior"
            >
              ←
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => onIndex(index + 1)}
              className="px-1 py-2 text-ink hover:text-muted disabled:text-rule"
              aria-label="Foto siguiente"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

/** The photo fills the middle row and scales to fit; a quiet label shows while it loads. */
function LightboxImage({ id, alt }: { id: string; alt: string }) {
  const url = useImage(id)
  if (url === undefined) {
    return (
      <p className="absolute inset-0 flex items-center justify-center text-meta text-faint" aria-live="polite">
        Cargando
      </p>
    )
  }
  if (url === null) {
    return (
      <p className="absolute inset-0 flex items-center justify-center text-meta text-muted" role="alert">
        No se pudo cargar esta foto.
      </p>
    )
  }
  return <img src={url} alt={alt} className="absolute inset-0 h-full w-full object-contain" />
}
