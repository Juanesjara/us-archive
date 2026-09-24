import { useRef, useState } from 'react'
import { Timestamp } from 'firebase/firestore'
import { addPhoto } from '../services/archive'
import { formatFull, formatTime, fromInputDate, todayInputDate } from '../lib/format'
import { readPhotoMeta, reverseGeocode } from '../lib/photoMeta'
import { errorMessage } from '../routes/admin/shared'

type Status = 'waiting' | 'reading' | 'uploading' | 'done' | 'error'

interface UploadItem {
  id: string
  name: string
  status: Status
  detail?: string
}

const statusLabel: Record<Status, string> = {
  waiting: 'En espera',
  reading: 'Leyendo fecha y lugar',
  uploading: 'Subiendo',
  done: 'Lista',
  error: 'No se pudo subir',
}

/** Reads metadata, resolves the place and uploads one photo. Returns a short summary for the list. */
async function uploadOne(file: File, onStatus: (s: Status) => void): Promise<string> {
  onStatus('reading')
  const meta = await readPhotoMeta(file)
  const place = meta.lat != null && meta.lng != null ? await reverseGeocode(meta.lat, meta.lng) : null

  onStatus('uploading')
  const date = meta.takenAt ? Timestamp.fromDate(meta.takenAt) : fromInputDate(todayInputDate())!
  await addPhoto(file, {
    date,
    hasTime: meta.takenAt != null,
    location: place?.label,
    city: place?.city,
    lat: meta.lat,
    lng: meta.lng,
  })

  const when = meta.takenAt ? `${formatFull(meta.takenAt)}, ${formatTime(meta.takenAt)}` : 'Sin fecha en la foto, se usó hoy'
  const where = place?.label ?? (meta.lat != null ? 'Lugar no encontrado' : 'Sin ubicación en la foto')
  return `${when}
${where}`
}

/** Picks one or more photos and uploads them in order. Any member can use it. */
export function PhotoUploader() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<UploadItem[]>([])
  const busy = items.some((i) => i.status === 'waiting' || i.status === 'reading' || i.status === 'uploading')

  const patch = (id: string, next: Partial<UploadItem>) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...next } : i)))

  const start = async (files: File[]) => {
    const batch = files.map((f, n) => ({ id: `${Date.now()}-${n}`, name: f.name, status: 'waiting' as Status }))
    setItems(batch)
    // One at a time: keeps memory low on phones and respects the geocoder's rate limit.
    for (let n = 0; n < files.length; n++) {
      const id = batch[n].id
      try {
        const detail = await uploadOne(files[n], (status) => patch(id, { status }))
        patch(id, { status: 'done', detail })
      } catch (err) {
        patch(id, { status: 'error', detail: errorMessage(err) })
      }
    }
  }

  const done = items.filter((i) => i.status === 'done').length

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="Elegir fotos"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])]
          e.target.value = ''
          if (files.length) void start(files)
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-ui font-medium text-paper transition-colors hover:bg-body disabled:pointer-events-none disabled:opacity-40"
      >
        {busy ? `Subiendo ${done + 1} de ${items.length}` : 'Subir fotos'}
      </button>
      <p className="mt-3 max-w-md text-meta text-muted">
        Puedes elegir varias a la vez. La fecha, la hora y el lugar se leen de cada foto, y la galería las agrupa en
        álbumes por día y lugar.
      </p>

      {items.length > 0 ? (
        <ul className="mt-6 rounded-sm bg-well p-5 sm:p-6" aria-live="polite">
          {items.map((i) => (
            <li key={i.id} className="border-t border-rule py-3 first:border-t-0 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-4">
                <span className="truncate text-ui text-ink">{i.name}</span>
                <span className={`shrink-0 text-meta ${i.status === 'error' ? 'text-danger' : 'text-muted'}`}>
                  {statusLabel[i.status]}
                </span>
              </div>
              {i.detail ? (
                <p className={`mt-1 whitespace-pre-line text-meta ${i.status === 'error' ? 'text-danger' : 'text-muted'}`}>
                  {i.detail}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
