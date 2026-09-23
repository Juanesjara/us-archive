import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useCollection } from '../../hooks/useCollection'
import type { Photo } from '../../types'
import { EmptyState, ErrorNote, Loading } from '../../components/ui/EmptyState'
import { ArchiveImage } from '../../components/ui/ArchiveImage'
import { Lightbox } from '../../components/ui/Lightbox'
import { formatShort } from '../../lib/format'
import { groupByPlace } from '../../lib/places'

const count = (n: number) => (n === 1 ? '1 foto' : `${n} fotos`)

/** /archive/places/:slug. One place, its photos grouped by neighbourhood. */
export function Place() {
  const { slug } = useParams()
  const { items, loading, error } = useCollection<Photo>('photos')
  const place = useMemo(() => groupByPlace(items).find((p) => p.slug === slug) ?? null, [items, slug])
  const [openId, setOpenId] = useState<string | null>(null)

  // The viewer walks through photos in the order the page shows them.
  const ordered = useMemo(() => place?.areas.flatMap((a) => a.photos) ?? [], [place])
  const openIndex = openId ? ordered.findIndex((p) => p.id === openId) : -1
  const showAreaNames = (place?.areas.length ?? 0) > 1 || Boolean(place?.areas[0]?.name)

  return (
    <div className="enter">
      <Link to="/archive/places" className="text-meta text-muted hover:text-ink">
        Lugares
      </Link>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error} />
      ) : !place ? (
        <EmptyState title="Este lugar ya no tiene fotos." />
      ) : (
        <>
          <h1 className="serif mt-2 text-title text-ink">{place.name}</h1>
          <p className="mt-1 text-meta text-muted">{count(place.photos.length)}</p>

          <div className="mt-10 flex flex-col gap-14">
            {place.areas.map((area) => (
              <section key={area.name ?? '_'}>
                {showAreaNames ? (
                  <header className="mb-5 flex items-baseline justify-between gap-6 border-b border-rule pb-3">
                    <h2 className="serif text-lead text-ink">{area.name ?? `Otras de ${place.name}`}</h2>
                    <span className="shrink-0 text-meta text-muted">{count(area.photos.length)}</span>
                  </header>
                ) : null}
                <ul className="columns-2 gap-4 sm:gap-6 md:columns-3">
                  {area.photos.map((photo) => (
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
                        <span className="mt-2 flex items-baseline justify-between gap-3">
                          <span className="serif truncate text-ui text-body">{photo.caption || ''}</span>
                          <span className="shrink-0 text-meta text-faint">{formatShort(photo.date)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
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
