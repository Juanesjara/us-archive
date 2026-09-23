import { useEffect, useId, useMemo, useRef } from 'react'
import { useImage } from './ArchiveImage'

interface ImagePickerProps {
  label: string
  file: File | null
  onChange: (file: File | null) => void
  /** Existing images/{id} to show when no new file is chosen. */
  currentId?: string | null
  onRemoveCurrent?: () => void
  required?: boolean
}

export function ImagePicker({ label, file, onChange, currentId, onRemoveCurrent, required }: ImagePickerProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  const currentUrl = useImage(currentId)
  const shown = preview ?? currentUrl ?? null

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-meta text-muted">
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        required={required && !currentId}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {shown ? (
        <div className="flex flex-col gap-2">
          <img src={shown} alt="" className="max-h-72 w-auto rounded-sm bg-well object-contain" />
          <div className="flex gap-4 text-meta">
            <button type="button" className="text-ink hover:text-muted" onClick={() => inputRef.current?.click()}>
              Cambiar
            </button>
            <button
              type="button"
              className="text-muted hover:text-ink"
              onClick={() => {
                if (file) {
                  onChange(null)
                  if (inputRef.current) inputRef.current.value = ''
                } else {
                  onRemoveCurrent?.()
                }
              }}
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-28 w-full items-center justify-center rounded-sm border border-dashed border-rule text-ui text-muted transition-colors hover:border-faint hover:text-ink"
        >
          Elegir una imagen
        </button>
      )}
    </div>
  )
}
