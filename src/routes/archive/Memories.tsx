import { useCollection } from '../../hooks/useCollection'
import type { Memory } from '../../types'
import { EmptyState, ErrorNote, Loading } from '../../components/ui/EmptyState'
import { formatMonthYear } from '../../lib/format'
import { ArchiveImage } from '../../components/ui/ArchiveImage'

export function Memories() {
  const { items, loading, error } = useCollection<Memory>('memories')

  return (
    <div className="enter">
      <h1 className="serif text-title text-ink">Recuerdos</h1>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error} />
      ) : items.length === 0 ? (
        <EmptyState title="Todavía no hay nada escrito." text="El primero siempre es el más difícil." />
      ) : (
        <ol className="mt-10">
          {items.map((m) => (
            <li
              key={m.id}
              className="grid gap-3 border-t border-rule py-10 sm:grid-cols-[10rem_1fr] sm:gap-10 first:border-t-0 first:pt-0"
            >
              <p className="text-meta text-muted sm:pt-1.5">{formatMonthYear(m.date)}</p>
              <div className="max-w-2xl">
                <h2 className="serif text-lead text-ink">{m.title}</h2>
                {m.location ? <p className="mt-1 text-meta text-muted">{m.location}</p> : null}
                {m.photoId ? (
                  <ArchiveImage id={m.photoId} ratio="4 / 3" className="mt-6 max-h-[70vh] w-auto max-w-full rounded-sm" />
                ) : null}
                {m.description ? (
                  <p className="serif mt-5 whitespace-pre-line text-prose text-body">{m.description}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
