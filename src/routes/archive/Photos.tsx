import { useState } from 'react'
import { useCollection } from '../../hooks/useCollection'
import type { Photo } from '../../types'
import { EmptyState, ErrorNote, Loading } from '../../components/ui/EmptyState'
import { Lightbox } from '../../components/ui/Lightbox'
import { ArchiveImage } from '../../components/ui/ArchiveImage'
import { formatShort } from '../../lib/format'

export function Photos() {
  const { items, loading, error } = useCollection<Photo>('photos')
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="enter">
      <h1 className="serif text-title text-ink">Fotos</h1>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error} />
      ) : items.length === 0 ? (
        <EmptyState title="Todavía no hay fotos." text="Ya lo arreglaremos." />
      ) : (
        <ul className="mt-10 columns-2 gap-4 sm:gap-6 md:columns-3">
          {items.map((photo, i) => (
            <li key={photo.id} className="mb-4 break-inside-avoid sm:mb-6">
              <button
                type="button"
                onClick={() => setOpen(i)}
                className="block w-full text-left"
                aria-label={photo.caption ? `Abrir foto: ${photo.caption}` : 'Abrir foto'}
              >
                <ArchiveImage
                  id={photo.imageId}
                  alt={photo.caption || ''}
                  className="w-full rounded-sm transition-opacity duration-300 hover:opacity-90"
                />
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <span className="serif truncate text-ui text-body">{photo.caption || ''}</span>
                  <span className="shrink-0 text-meta text-faint">{formatShort(photo.date)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open !== null ? <Lightbox photos={items} index={open} onClose={() => setOpen(null)} onIndex={setOpen} /> : null}
    </div>
  )
}
