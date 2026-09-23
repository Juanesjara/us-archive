import { useState, type FormEvent } from 'react'
import { useCollection } from '../../hooks/useCollection'
import { THING_CATEGORIES, THING_LABELS, type Thing, type ThingCategory } from '../../types'
import { addThing, deleteThing, updateThing } from '../../services/archive'
import { SelectField, TextArea, TextField } from '../../components/ui/Field'
import { EmptyState, ErrorNote, Loading } from '../../components/ui/EmptyState'
import { formatMonthYear, fromInputDate, toInputDate } from '../../lib/format'
import { AdminSection, Disclosure, FormFooter, Row, confirmDelete, useAction } from './shared'

interface FormState {
  title: string
  category: ThingCategory
  note: string
  date: string
}

const empty = (): FormState => ({ title: '', category: 'random', note: '', date: '' })

const categoryOptions = THING_CATEGORIES.map((c) => ({ value: c, label: THING_LABELS[c] }))

function ThingForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: FormState
  submitLabel: string
  onSubmit: (state: FormState) => Promise<void>
  onCancel: () => void
}) {
  const [state, setState] = useState<FormState>(initial)
  const { busy, error, run } = useAction()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void run(() => onSubmit(state))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <TextField
        label="Título"
        value={state.title}
        onChange={(e) => setState({ ...state, title: e.target.value })}
        required
        maxLength={120}
      />
      <SelectField
        label="Categoría"
        options={categoryOptions}
        value={state.category}
        onChange={(e) => setState({ ...state, category: e.target.value as ThingCategory })}
      />
      <TextArea
        label="Nota (opcional)"
        value={state.note}
        onChange={(e) => setState({ ...state, note: e.target.value })}
        maxLength={1000}
      />
      <TextField
        label="Fecha (opcional)"
        type="date"
        value={state.date}
        onChange={(e) => setState({ ...state, date: e.target.value })}
      />
      <FormFooter busy={busy} error={error} submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  )
}

export function AdminThings() {
  const { items, loading, error } = useCollection<Thing>('things', 'createdAt')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const del = useAction()

  const onDelete = (t: Thing) => {
    if (!confirmDelete(`"${t.title}"`)) return
    setDeletingId(t.id)
    void del.run(() => deleteThing(t.id), () => setDeletingId(null))
  }

  return (
    <AdminSection title="Cosas">
      <Disclosure label="Agregar cosa" open={adding} onOpen={() => setAdding(true)}>
        <ThingForm
          initial={empty()}
          submitLabel="Agregar cosa"
          onCancel={() => setAdding(false)}
          onSubmit={async (s) => {
            await addThing({ title: s.title, category: s.category, note: s.note, date: fromInputDate(s.date) })
            setAdding(false)
          }}
        />
      </Disclosure>

      {del.error ? (
        <p className="mt-6 text-meta text-danger" role="alert">
          {del.error}
        </p>
      ) : null}

      <div className="mt-10">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorNote message={error} />
        ) : items.length === 0 ? (
          <EmptyState title="Todavía no hay nada guardado." />
        ) : (
          <ul>
            {items.map((t) =>
              editing === t.id ? (
                <li key={t.id} className="border-t border-rule py-5 first:border-t-0">
                  <ThingForm
                    initial={{ title: t.title, category: t.category, note: t.note ?? '', date: toInputDate(t.date) }}
                    submitLabel="Guardar cambios"
                    onCancel={() => setEditing(null)}
                    onSubmit={async (s) => {
                      await updateThing(t.id, {
                        title: s.title,
                        category: s.category,
                        note: s.note,
                        date: fromInputDate(s.date),
                      })
                      setEditing(null)
                    }}
                  />
                </li>
              ) : (
                <Row
                  key={t.id}
                  onEdit={() => setEditing(t.id)}
                  onDelete={() => onDelete(t)}
                  deleting={deletingId === t.id}
                >
                  <p className="serif text-prose text-ink">{t.title}</p>
                  <p className="text-meta text-muted">
                    {THING_LABELS[t.category]}
                    {t.date ? `, ${formatMonthYear(t.date)}` : ''}
                  </p>
                </Row>
              ),
            )}
          </ul>
        )}
      </div>
    </AdminSection>
  )
}
