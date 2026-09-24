import { useMemo, useState } from 'react'
import { useCollection } from '../../hooks/useCollection'
import type { Photo } from '../../types'
import { EmptyState, ErrorNote, Loading } from '../../components/ui/EmptyState'
import { Lightbox } from '../../components/ui/Lightbox'
import { ArchiveImage } from '../../components/ui/ArchiveImage'
import { formatFull } from '../../lib/format'
import { groupIntoAlbums } from '../../lib/albums'
import { PhotoUploader } from '../../components/PhotoUploader'

export function Photos() {
  const { items, loading, error } = useCollection<Photo>('photos')
  const [openId, setOpenId] = useState<string | null>(null)

  const albums = useMemo(() => groupIntoAlbums(items), [items])
  // The lightbox walks through photos in the same order the albums show them.
  const ordered = useMemo(() => albums.flatMap((a) => a.photos), [albums])
  const openIndex = openId ? ordered.findIndex((p) => p.id === openId) : -1

  return (
    <div className="enter">
      <h1 className="serif text-title text-ink">Fotos</h1>
      <div className="mt-6">
        <PhotoUploader />
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error} />
      ) : items.length === 0 ? (
        <EmptyState title="Todavía no hay fotos." text="Ya lo arreglaremos." />
      ) : (
        <div className="mt-10 flex flex-col gap-16">
          {albums.map((album) => (
            <section key={album.key} aria-label={`${formatFull(album.day)}${album.place ? `, ${album.place}` : ''}`}>
              <header className="mb-5 border-b border-rule pb-3">
                <h2 className="serif text-lead text-ink">{formatFull(album.day)}</h2>
                <div className="mt-1 flex items-baseline justify-between gap-6 text-meta text-muted">
                  <span className="truncate">{album.place ?? ''}</span>
                  <span className="shrink-0">
                    {album.photos.length === 1 ? '1 foto' : `${album.photos.length} fotos`}
                  </span>
                </div>
              </header>
              <ul className="columns-2 gap-4 sm:gap-6 md:columns-3">
                {album.photos.map((photo) => (
                  <li key={photo.id} className="mb-4 break-inside-avoid sm:mb-6">
                    <button
                      type="button"
                      onClick={() => setOpenId(photo.id)}
                      className="block w-full text-left"
                      aria-label={photo.caption ? `Abrir foto: ${photo.caption}` : 'Abrir foto'}
                    >
                      <ArchiveImage
                        id={photo.imageId}
                        alt={photo.caption || ''}
                        className="w-full rounded-sm transition-opacity duration-300 hover:opacity-90"
                      />
                      {photo.caption ? (
                        <span className="serif mt-2 block truncate text-ui text-body">{photo.caption}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {openIndex >= 0 ? (
        <Lightbox
          photos={ordered}
          index={openIndex}
          onClose={() => setOpenId(null)}
          onIndex={(n) => setOpenId(ordered[n]?.id ?? null)}
        />
      ) : null}
    </div>
  )
}
