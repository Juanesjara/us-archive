import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useCollection } from '../../hooks/useCollection'
import type { Located, Photo } from '../../types'
import { EmptyState, ErrorNote, Loading } from '../../components/ui/EmptyState'
import { ArchiveImage } from '../../components/ui/ArchiveImage'
import { Lightbox } from '../../components/ui/Lightbox'
import { formatMonthYear } from '../../lib/format'
import { groupByPlace, type PlaceGroup } from '../../lib/places'

// MapLibre is large; it only loads when this page has something to put on the map.
// After a deploy an open tab may ask for a chunk that no longer exists; don't take the page down with it.
const PhotoMap = lazy(() =>
  import('../../components/ui/PhotoMap')
    .then((m) => ({ default: m.PhotoMap }))
    .catch(() => ({
      default: () => <p className="text-meta text-muted">No se pudo cargar el mapa. Recarga la página.</p>,
    })),
)

const hasCoords = (p: Photo): p is Located => p.lat != null && p.lng != null

const count = (n: number) => (n === 1 ? '1 foto' : `${n} fotos`)

/** "Agosto de 2026", or "Agosto de 2026 a septiembre de 2026" when the visits span months. */
function span(place: PlaceGroup) {
  const a = formatMonthYear(place.first)
  const b = formatMonthYear(place.last)
  return a === b ? a : `${a} a ${b.toLowerCase()}`
}

export function Places() {
  const { items, loading, error } = useCollection<Photo>('photos')
  const places = useMemo(() => groupByPlace(items), [items])
  const located = useMemo(() => items.filter(hasCoords), [items])
  // ids: a group opened from one map thumbnail; null walks through every located photo.
  const [open, setOpen] = useState<{ id: string; ids: string[] | null } | null>(null)
  const viewing = useMemo(
    () => (open?.ids ? located.filter((p) => open.ids?.includes(p.id)) : located),
    [located, open],
  )
  const openIndex = open ? viewing.findIndex((p) => p.id === open.id) : -1

  return (
    <div className="enter">
      <h1 className="serif text-title text-ink">Lugares</h1>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error} />
      ) : places.length === 0 ? (
        <EmptyState
          title="Todavía no hay lugares."
          text="Aparecen solos cuando subimos fotos que traen su ubicación."
        />
      ) : (
        <>
          {located.length > 0 ? (
            <div className="mt-8">
              <Suspense fallback={<div className="h-80 w-full rounded-sm bg-well sm:h-[28rem]" />}>
                <PhotoMap photos={located} onOpen={(id, ids) => setOpen({ id, ids: ids ?? null })} />
              </Suspense>
            </div>
          ) : null}
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3">
            {places.map((place) => (
              <li key={place.slug}>
                <Link to={`/archive/places/${place.slug}`} className="group block">
                  <ArchiveImage
                    id={place.photos[0].imageId}
                    ratio="4 / 5"
                    className="aspect-[4/5] w-full rounded-sm object-cover transition-opacity duration-300 group-hover:opacity-90"
                  />
                  <h2 className="serif mt-3 text-lead text-ink">{place.name}</h2>
                  <p className="text-meta text-muted">{count(place.photos.length)}</p>
                  <p className="text-meta text-faint">{span(place)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {openIndex >= 0 ? (
        <Lightbox
          photos={viewing}
          index={openIndex}
          onClose={() => setOpen(null)}
          onIndex={(n) => setOpen((o) => (o && viewing[n] ? { ...o, id: viewing[n].id } : null))}
        />
      ) : null}
    </div>
  )
}
