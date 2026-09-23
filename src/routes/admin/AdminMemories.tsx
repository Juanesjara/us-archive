import { useState, type FormEvent } from 'react'
import { useCollection } from '../../hooks/useCollection'
import type { Memory } from '../../types'
import { addMemory, deleteMemory, updateMemory } from '../../services/archive'
import { TextArea, TextField } from '../../components/ui/Field'
import { ImagePicker } from '../../components/ui/ImagePicker'
import { EmptyState, ErrorNote, Loading } from '../../components/ui/EmptyState'
import { formatMonthYear, fromInputDate, toInputDate, todayInputDate } from '../../lib/format'
import { AdminSection, Disclosure, FormFooter, Row, confirmDelete, useAction } from './shared'

interface FormState {
  date: string
  title: string
  description: string
  location: string
}

const empty = (): FormState => ({ date: todayInputDate(), title: '', description: '', location: '' })

function MemoryForm({
  initial,
  currentPhotoId,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: FormState
  currentPhotoId?: string | null
  submitLabel: string
  onSubmit: (state: FormState, file: File | null, removePhoto: boolean) => Promise<void>
  onCancel: () => void
}) {
  const [state, setState] = useState<FormState>(initial)
  const [file, setFile] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const { busy, error, run } = useAction()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void run(() => onSubmit(state, file, removePhoto))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <TextField
        label="Fecha"
        type="date"
        value={state.date}
        onChange={(e) => setState({ ...state, date: e.target.value })}
        required
      />
      <TextField
        label="Título"
        value={state.title}
        onChange={(e) => setState({ ...state, title: e.target.value })}
        required
        maxLength={120}
      />
      <TextArea
        label="Descripción (opcional)"
        value={state.description}
        onChange={(e) => setState({ ...state, description: e.target.value })}
        maxLength={2000}
      />
      <TextField
        label="Lugar (opcional)"
        value={state.location}
        onChange={(e) => setState({ ...state, location: e.target.value })}
        maxLength={120}
      />
      <ImagePicker
        label="Foto (opcional)"
        file={file}
        onChange={setFile}
        currentId={removePhoto ? null : currentPhotoId}
        onRemoveCurrent={() => setRemovePhoto(true)}
      />
      <FormFooter busy={busy} error={error} submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  )
}

export function AdminMemories() {
  const { items, loading, error } = useCollection<Memory>('memories')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const del = useAction()

  const onDelete = (m: Memory) => {
    if (!confirmDelete(`"${m.title}"`)) return
    setDeletingId(m.id)
    void del.run(() => deleteMemory(m.id, m.photoId), () => setDeletingId(null))
  }

  return (
    <AdminSection title="Recuerdos">
      <Disclosure label="Agregar recuerdo" open={adding} onOpen={() => setAdding(true)}>
        <MemoryForm
          initial={empty()}
          submitLabel="Agregar recuerdo"
          onCancel={() => setAdding(false)}
          onSubmit={async (s, file) => {
            const date = fromInputDate(s.date)
            if (!date) throw new Error('Elige una fecha.')
            await addMemory({ date, title: s.title, description: s.description, location: s.location }, file)
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
          <EmptyState title="Todavía no hay recuerdos." />
        ) : (
          <ul>
            {items.map((m) =>
              editing === m.id ? (
                <li key={m.id} className="border-t border-rule py-5 first:border-t-0">
                  <MemoryForm
                    initial={{
                      date: toInputDate(m.date),
                      title: m.title,
                      description: m.description ?? '',
                      location: m.location ?? '',
                    }}
                    currentPhotoId={m.photoId}
                    submitLabel="Guardar cambios"
                    onCancel={() => setEditing(null)}
                    onSubmit={async (s, file, removePhoto) => {
                      const date = fromInputDate(s.date)
                      if (!date) throw new Error('Elige una fecha.')
                      await updateMemory(
                        m.id,
                        { date, title: s.title, description: s.description, location: s.location },
                        file,
                        m.photoId,
                        removePhoto,
                      )
                      setEditing(null)
                    }}
                  />
                </li>
              ) : (
                <Row
                  key={m.id}
                  onEdit={() => setEditing(m.id)}
                  onDelete={() => onDelete(m)}
                  deleting={deletingId === m.id}
                >
                  <p className="serif text-prose text-ink">{m.title}</p>
                  <p className="text-meta text-muted">
                    {formatMonthYear(m.date)}
                    {m.location ? `, ${m.location}` : ''}
                    {m.photoId ? ', con foto' : ''}
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
