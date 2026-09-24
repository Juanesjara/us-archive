import { useState, type FormEvent } from 'react'
import { useCollection } from '../../hooks/useCollection'
import type { Photo } from '../../types'
import { deletePhoto, updatePhotoDetails } from '../../services/archive'
import { ArchiveImage } from '../../components/ui/ArchiveImage'
import { EmptyState, ErrorNote, Loading } from '../../components/ui/EmptyState'
import {
  formatFull,
  formatTime,
  fromInputDateTime,
  toInputDate,
  toInputTime,
} from '../../lib/format'
import { TextField } from '../../components/ui/Field'
import { groupIntoAlbums } from '../../lib/albums'
import { AdminSection, Row, confirmDelete, useAction } from './shared'
import { PhotoUploader } from '../../components/PhotoUploader'

function PhotoDetailsForm({ photo, onDone }: { photo: Photo; onDone: () => void }) {
  const [caption, setCaption] = useState(photo.caption ?? '')
  const [date, setDate] = useState(toInputDate(photo.date))
  const [clock, setClock] = useState(photo.hasTime ? toInputTime(photo.date) : '')
  const { busy, error, run } = useAction()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      const stamp = fromInputDateTime(date, clock)
      if (!stamp) throw new Error('Elige una fecha.')
      await updatePhotoDetails(photo.id, { caption, date: stamp, hasTime: Boolean(clock) })
    }, onDone)
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onDone()
      }}
    >
      <TextField
        label="Descripción (opcional)"
        className="serif text-prose"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Escribe una descripción"
        maxLength={200}
        autoFocus
      />
      <div className="grid grid-cols-[3fr_2fr] gap-4">
        <TextField label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <TextField label="Hora (opcional)" type="time" value={clock} onChange={(e) => setClock(e.target.value)} />
      </div>
      {error ? (
        <p className="text-meta text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex gap-5 text-meta">
        <button type="submit" disabled={busy} className="text-ink hover:text-muted disabled:opacity-40">
          {busy ? 'Guardando' : 'Guardar'}
        </button>
        <button type="button" onClick={onDone} disabled={busy} className="text-muted hover:text-ink">
          Cancelar
        </button>
      </div>
    </form>
  )
}

export function AdminPhotos() {
  const { items, loading, error } = useCollection<Photo>('photos')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const del = useAction()
  const albums = groupIntoAlbums(items)

  const onDelete = (photo: Photo) => {
    if (!confirmDelete('esta foto')) return
    setDeletingId(photo.id)
    void del.run(() => deletePhoto(photo.id, photo.imageId), () => setDeletingId(null))
  }

  return (
    <AdminSection title="Fotos">
      <PhotoUploader />

      {del.error ? (
        <p className="mt-6 text-meta text-danger" role="alert">
          {del.error}
        </p>
      ) : null}

      <div className="mt-12">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorNote message={error} />
        ) : items.length === 0 ? (
          <EmptyState title="Todavía no hay fotos." />
        ) : (
          <div className="flex flex-col gap-10">
            {albums.map((album) => (
              <section key={album.key}>
                <h2 className="text-meta text-muted">
                  {formatFull(album.day)}
                  {album.place ? `, ${album.place}` : ''}
                </h2>
                <ul className="mt-2">
                  {album.photos.map((photo) => (
                    <Row
                      key={photo.id}
                      onEdit={editingId === photo.id ? undefined : () => setEditingId(photo.id)}
                      onDelete={() => onDelete(photo)}
                      deleting={deletingId === photo.id}
                    >
                      <div className="flex gap-4">
                        <ArchiveImage
                          id={photo.imageId}
                          ratio="1 / 1"
                          className="h-16 w-16 shrink-0 rounded-sm object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          {editingId === photo.id ? (
                            <PhotoDetailsForm photo={photo} onDone={() => setEditingId(null)} />
                          ) : (
                            <p className={`serif truncate text-prose ${photo.caption ? 'text-ink' : 'text-faint'}`}>
                              {photo.caption || 'Sin descripción'}
                            </p>
                          )}
                          <p className="text-meta text-muted">
                            {photo.hasTime ? formatTime(photo.date) : 'Sin hora'}
                            {photo.location ? `, ${photo.location}` : ''}
                          </p>
                        </div>
                      </div>
                    </Row>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
      <p className="mt-10 text-meta text-faint">
        Con "Editar" cambias la descripción, la fecha y la hora. La descripción también se puede editar desde la galería.
      </p>
    </AdminSection>
  )
}
