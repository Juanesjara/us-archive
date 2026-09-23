import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : 'Algo salió mal. Inténtalo de nuevo.'

/** Wraps an async action with busy and error state. */
export function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<void>, onDone?: () => void) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      onDone?.()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, run, clearError: () => setError(null) }
}

export function AdminSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="enter">
      <h1 className="serif text-title text-ink">{title}</h1>
      <div className="mt-8">{children}</div>
    </section>
  )
}

interface FormFooterProps {
  busy: boolean
  error: string | null
  submitLabel: string
  onCancel?: () => void
}

export function FormFooter({ busy, error, submitLabel, onCancel }: FormFooterProps) {
  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="text-meta text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-6">
        <Button type="submit" disabled={busy}>
          {busy ? 'Guardando' : submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="quiet" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/** A collapsed "Add" affordance that opens into a form. */
export function Disclosure({
  label,
  open,
  onOpen,
  children,
}: {
  label: string
  open: boolean
  onOpen: () => void
  children: ReactNode
}) {
  if (!open) {
    return (
      <Button variant="quiet" onClick={onOpen}>
        + {label}
      </Button>
    )
  }
  return <div className="rounded-sm bg-well p-5 sm:p-6">{children}</div>
}

interface RowProps {
  children: ReactNode
  onEdit?: () => void
  onDelete: () => void
  deleting?: boolean
}

export function Row({ children, onEdit, onDelete, deleting }: RowProps) {
  return (
    <li className="flex items-start justify-between gap-6 border-t border-rule py-5 first:border-t-0">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 gap-4 text-meta">
        {onEdit ? (
          <button type="button" onClick={onEdit} className="text-ink hover:text-muted">
            Editar
          </button>
        ) : null}
        <button type="button" onClick={onDelete} disabled={deleting} className="text-muted hover:text-danger disabled:opacity-40">
          Borrar
        </button>
      </div>
    </li>
  )
}

export const confirmDelete = (what: string) => window.confirm(`¿Borrar ${what}? No se puede deshacer.`)
