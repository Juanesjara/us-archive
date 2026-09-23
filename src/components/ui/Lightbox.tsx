import { useEffect, useState, type FormEvent } from 'react'
import type { Photo } from '../../types'
import { formatFull, formatTime } from '../../lib/format'
import { useAuth } from '../../hooks/useAuth'
import { setPhotoCaption } from '../../services/archive'
import { ArchiveImage } from './ArchiveImage'

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
  const { isAdmin } = useAuth()
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

  if (!photo) return null

  const when = photo.hasTime ? `${formatFull(photo.date)}, ${formatTime(photo.date)}` : formatFull(photo.date)

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
        <button type="button" onClick={onClose} className="text-ui text-ink hover:text-muted" aria-label="Cerrar">
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

      <div className="flex items-end justify-between gap-6 px-6 py-6 sm:px-10" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0 flex-1">
          {editing ? (
            <CaptionEditor key={photo.id} photo={photo} onDone={() => setEditingId(null)} />
          ) : (
            <>
              {photo.caption ? <p className="serif text-prose text-ink">{photo.caption}</p> : null}
              <p className="text-meta text-muted">{when}</p>
              {photo.location ? <p className="text-meta text-muted">{photo.location}</p> : null}
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setEditingId(photo.id)}
                  className="mt-2 text-meta text-ink hover:text-muted"
                >
                  {photo.caption ? 'Editar descripción' : 'Añadir descripción'}
                </button>
              ) : null}
            </>
          )}
        </div>
        {editing ? null : (
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
        )}
      </div>
    </div>
  )
}
