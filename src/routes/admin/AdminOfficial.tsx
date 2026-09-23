import { useState, type FormEvent } from 'react'
import { useDocument } from '../../hooks/useCollection'
import type { OfficialState } from '../../types'
import { OFFICIAL_PATH, removeOfficialPhoto, saveOfficial } from '../../services/archive'
import { TextField } from '../../components/ui/Field'
import { ImagePicker } from '../../components/ui/ImagePicker'
import { Loading } from '../../components/ui/EmptyState'
import { fromInputDate, toInputDate, todayInputDate } from '../../lib/format'
import { AdminSection, FormFooter, useAction } from './shared'

const DEFAULT_CAPTION = 'Primer recuerdo oficial.'

function OfficialForm({ data }: { data: OfficialState | null }) {
  const [active, setActive] = useState(data?.active ?? false)
  const [date, setDate] = useState(toInputDate(data?.date) || todayInputDate())
  const [caption, setCaption] = useState(data?.caption || DEFAULT_CAPTION)
  const [file, setFile] = useState<File | null>(null)
  const [saved, setSaved] = useState(false)
  const { busy, error, run } = useAction()
  const removal = useAction()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSaved(false)
    void run(
      async () => {
        const stamp = fromInputDate(date)
        if (!stamp) throw new Error('Elige una fecha.')
        await saveOfficial({ active, date: stamp, caption }, file, data)
        setFile(null)
      },
      () => setSaved(true),
    )
  }

  return (
    <form onSubmit={submit} className="mt-10 flex max-w-lg flex-col gap-6">
      <label className="flex cursor-pointer items-center gap-3 text-ui text-ink">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 accent-accent"
        />
        Mostrar "Nuevo recuerdo agregado." en el inicio
      </label>

      <TextField label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      <TextField label="Descripción" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} />

      <ImagePicker
        label="Primera foto oficial"
        file={file}
        onChange={setFile}
        currentId={data?.photoId}
        onRemoveCurrent={() => void removal.run(() => removeOfficialPhoto(data))}
      />
      {removal.error ? (
        <p className="text-meta text-danger" role="alert">
          {removal.error}
        </p>
      ) : null}

      <FormFooter busy={busy} error={error} submitLabel="Guardar" />
      {saved && !busy ? (
        <p className="text-meta text-muted" role="status">
          Guardado.
        </p>
      ) : null}
    </form>
  )
}

export function AdminOfficial() {
  const { data, loading } = useDocument<OfficialState>(OFFICIAL_PATH)

  return (
    <AdminSection title="Oficial">
      <p className="max-w-lg text-ui text-muted">
        Apagado, el archivo termina con "Una cosa más". Encendido, el inicio muestra el primer recuerdo oficial y esa
        sección se cierra.
      </p>
      {/* Rendered only after the first snapshot, so the form seeds its fields from the stored document once. */}
      {loading ? <Loading /> : <OfficialForm data={data} />}
    </AdminSection>
  )
}
