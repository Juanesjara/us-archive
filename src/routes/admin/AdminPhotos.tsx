import { useState, type FormEvent } from 'react'
import { useCollection } from '../../hooks/useCollection'
import type { Photo } from '../../types'
import { addPhoto, deletePhoto, updatePhoto } from '../../services/archive'
import { TextField } from '../../components/ui/Field'
import { ImagePicker } from '../../components/ui/ImagePicker'
import { ArchiveImage } from '../../components/ui/ArchiveImage'
import { EmptyState, ErrorNote, Loading } from '../../components/ui/EmptyState'
import { formatShort, fromInputDate, toInputDate, todayInputDate } from '../../lib/format'
import { AdminSection, Disclosure, FormFooter, Row, confirmDelete, useAction } from './shared'

interface FormState {
  date: string
  caption: string
  location: string
}

const empty = (): FormState => ({ date: todayInputDate(), caption: '', location: '' })

function PhotoForm({
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
    if (withFile && !file) return
    void run(() => onSubmit(state, file))
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {withFile ? <ImagePicker label="Imagen" file={file} onChange={setFile} required /> : null}
      <TextField
        label="Fecha"
        type="date"
        value={state.date}
        onChange={(e) => setState({ ...state, date: e.target.value })}
        required
      />
      <TextField
        label="Descripción (opcional)"
        value={state.caption}
        onChange={(e) => setState({ ...state, caption: e.target.value })}
        maxLength={200}
      />
      <TextField
        label="Lugar (opcional)"
        value={state.location}
        onChange={(e) => setState({ ...state, location: e.target.value })}
        maxLength={120}
      />
      <FormFooter busy={busy} error={error} submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  )
}

export function AdminPhotos() {
  const { items, loading, error } = useCollection<Photo>('photos')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const del = useAction()

  const onDelete = (photo: Photo) => {
    if (!confirmDelete('esta foto')) return
    setDeletingId(photo.id)
    void del.run(() => deletePhoto(photo.id, photo.imageId), () => setDeletingId(null))
  }

  return (
    <AdminSection title="Fotos">
      <Disclosure label="Agregar foto" open={adding} onOpen={() => setAdding(true)}>
        <PhotoForm
          initial={empty()}
          withFile
          submitLabel="Agregar foto"
          onCancel={() => setAdding(false)}
          onSubmit={async (s, file) => {
            const date = fromInputDate(s.date)
            if (!date || !file) throw new Error('Elige una imagen y una fecha.')
            await addPhoto(file, { date, caption: s.caption, location: s.location })
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
          <EmptyState title="Todavía no hay fotos." />
        ) : (
          <ul>
            {items.map((photo) =>
              editing === photo.id ? (
                <li key={photo.id} className="border-t border-rule py-5 first:border-t-0">
                  <PhotoForm
                    initial={{
                      date: toInputDate(photo.date),
                      caption: photo.caption ?? '',
                      location: photo.location ?? '',
                    }}
                    withFile={false}
                    submitLabel="Guardar cambios"
                    onCancel={() => setEditing(null)}
                    onSubmit={async (s) => {
                      const date = fromInputDate(s.date)
                      if (!date) throw new Error('Elige una fecha.')
                      await updatePhoto(photo.id, { date, caption: s.caption, location: s.location })
                      setEditing(null)
                    }}
                  />
                </li>
              ) : (
                <Row
                  key={photo.id}
                  onEdit={() => setEditing(photo.id)}
                  onDelete={() => onDelete(photo)}
                  deleting={deletingId === photo.id}
                >
                  <div className="flex gap-4">
                    <ArchiveImage id={photo.imageId} ratio="1 / 1" className="h-16 w-16 shrink-0 rounded-sm object-cover" />
                    <div className="min-w-0">
                      <p className="serif truncate text-prose text-ink">{photo.caption || 'Sin descripción'}</p>
                      <p className="text-meta text-muted">
                        {formatShort(photo.date)}
                        {photo.location ? `, ${photo.location}` : ''}
                      </p>
                    </div>
                  </div>
                </Row>
              ),
            )}
          </ul>
        )}
      </div>
    </AdminSection>
  )
}
