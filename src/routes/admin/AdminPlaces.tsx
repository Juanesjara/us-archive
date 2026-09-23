import { useState, type FormEvent } from 'react'
import { useCollection } from '../../hooks/useCollection'
import type { Place } from '../../types'
import { addPlace, deletePlace, updatePlace } from '../../services/archive'
import { TextArea, TextField } from '../../components/ui/Field'
import { ImagePicker } from '../../components/ui/ImagePicker'
import { EmptyState, ErrorNote, Loading } from '../../components/ui/EmptyState'
import { formatMonthYear, fromInputDate, toInputDate, todayInputDate } from '../../lib/format'
import { AdminSection, Disclosure, FormFooter, Row, confirmDelete, useAction } from './shared'

interface FormState {
  name: string
  date: string
  note: string
}

const empty = (): FormState => ({ name: '', date: todayInputDate(), note: '' })

function PlaceForm({
  initial,
  withFile,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: FormState
  withFile: boolean
  submitLabel: string
  onSubmit: (state: FormState, file: File | null) => Promise<void>
  onCancel: () => void
}) {
  const [state, setState] = useState<FormState>(initial)
  const [file, setFile] = useState<File | null>(null)
  const { busy, error, run } = useAction()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void run(() => onSubmit(state, file))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <TextField
        label="Lugar"
        value={state.name}
        onChange={(e) => setState({ ...state, name: e.target.value })}
        required
        maxLength={120}
      />
      <TextField
        label="Fecha"
        type="date"
        value={state.date}
        onChange={(e) => setState({ ...state, date: e.target.value })}
        required
      />
      <TextArea
        label="Nota (opcional)"
        value={state.note}
        onChange={(e) => setState({ ...state, note: e.target.value })}
        maxLength={1000}
      />
      {withFile ? <ImagePicker label="Foto (opcional)" file={file} onChange={setFile} /> : null}
      <FormFooter busy={busy} error={error} submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  )
}

export function AdminPlaces() {
  const { items, loading, error } = useCollection<Place>('places')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const del = useAction()

  const onDelete = (p: Place) => {
    if (!confirmDelete(`"${p.name}"`)) return
    setDeletingId(p.id)
    void del.run(() => deletePlace(p.id, p.photoId), () => setDeletingId(null))
  }

  return (
    <AdminSection title="Lugares">
      <Disclosure label="Agregar lugar" open={adding} onOpen={() => setAdding(true)}>
        <PlaceForm
          initial={empty()}
          withFile
          submitLabel="Agregar lugar"
          onCancel={() => setAdding(false)}
          onSubmit={async (s, file) => {
            const date = fromInputDate(s.date)
            if (!date) throw new Error('Elige una fecha.')
            await addPlace({ name: s.name, date, note: s.note }, file)
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
          <EmptyState title="Todavía no hay lugares." />
        ) : (
          <ul>
            {items.map((p) =>
              editing === p.id ? (
                <li key={p.id} className="border-t border-rule py-5 first:border-t-0">
                  <PlaceForm
                    initial={{ name: p.name, date: toInputDate(p.date), note: p.note ?? '' }}
                    withFile={false}
                    submitLabel="Guardar cambios"
                    onCancel={() => setEditing(null)}
                    onSubmit={async (s) => {
                      const date = fromInputDate(s.date)
                      if (!date) throw new Error('Elige una fecha.')
                      await updatePlace(p.id, { name: s.name, date, note: s.note })
                      setEditing(null)
                    }}
                  />
                </li>
              ) : (
                <Row
                  key={p.id}
                  onEdit={() => setEditing(p.id)}
                  onDelete={() => onDelete(p)}
                  deleting={deletingId === p.id}
                >
                  <p className="serif text-prose text-ink">{p.name}</p>
                  <p className="text-meta text-muted">
                    {formatMonthYear(p.date)}
                    {p.photoId ? ', con foto' : ''}
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
