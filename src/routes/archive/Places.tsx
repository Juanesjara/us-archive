import { useCollection } from '../../hooks/useCollection'
import type { Place } from '../../types'
import { EmptyState, ErrorNote, Loading } from '../../components/ui/EmptyState'
import { formatMonthYear } from '../../lib/format'
import { ArchiveImage } from '../../components/ui/ArchiveImage'

export function Places() {
  const { items, loading, error } = useCollection<Place>('places')

  return (
    <div className="enter">
      <h1 className="serif text-title text-ink">Lugares</h1>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error} />
      ) : items.length === 0 ? (
        <EmptyState title="Todavía no hay lugares." text="No hemos ido a ningún lado. Todavía." />
      ) : (
        <ul className="mt-10">
          {items.map((p) => (
            <li key={p.id} className="flex gap-6 border-t border-rule py-6 first:border-t-0 first:pt-0 sm:gap-10">
              {p.photoId ? (
                <ArchiveImage
                  id={p.photoId}
                  ratio="1 / 1"
                  className="h-20 w-20 shrink-0 rounded-sm object-cover sm:h-28 sm:w-28"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <h2 className="serif text-lead text-ink">{p.name}</h2>
                  <p className="text-meta text-muted">{formatMonthYear(p.date)}</p>
                </div>
                {p.note ? <p className="serif mt-2 max-w-xl text-prose text-body">{p.note}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
