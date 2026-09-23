import { useCollection } from '../../hooks/useCollection'
import { THING_CATEGORIES, THING_LABELS, type Thing } from '../../types'
import { EmptyState, ErrorNote, Loading } from '../../components/ui/EmptyState'
import { formatMonthYear } from '../../lib/format'

export function Things() {
  const { items, loading, error } = useCollection<Thing>('things', 'createdAt')

  const groups = THING_CATEGORIES.map((category) => ({
    category,
    items: items.filter((t) => t.category === category),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="enter">
      <h1 className="serif text-title text-ink">Cosas</h1>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error} />
      ) : items.length === 0 ? (
        <EmptyState title="Todavía no hay nada guardado." text="Juegos, libros, películas, canciones. Lo que sea cuenta." />
      ) : (
        <div className="mt-10 grid gap-x-16 gap-y-14 sm:grid-cols-2">
          {groups.map((g) => (
            <section key={g.category}>
              <h2 className="text-meta text-muted">{THING_LABELS[g.category]}</h2>
              <ul className="mt-3">
                {g.items.map((t) => (
                  <li key={t.id} className="border-t border-rule py-4 first:border-t-0 first:pt-0">
                    <div className="flex items-baseline justify-between gap-6">
                      <p className="serif text-lead text-ink">{t.title}</p>
                      {t.date ? <p className="shrink-0 text-meta text-faint">{formatMonthYear(t.date)}</p> : null}
                    </div>
                    {t.note ? <p className="serif mt-1 text-prose text-muted">{t.note}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
