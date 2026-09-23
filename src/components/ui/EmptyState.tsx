interface EmptyStateProps {
  title: string
  text?: string
}

export function EmptyState({ title, text }: EmptyStateProps) {
  return (
    <div className="py-16">
      <p className="serif text-lead text-ink">{title}</p>
      {text ? <p className="mt-1 text-ui text-muted">{text}</p> : null}
    </div>
  )
}

export function Loading() {
  return (
    <div className="py-16" aria-live="polite">
      <p className="text-ui text-faint">Cargando</p>
    </div>
  )
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="py-16" role="alert">
      <p className="text-ui text-danger">No se pudo cargar esta sección.</p>
      <p className="mt-1 text-meta text-muted">{message}</p>
    </div>
  )
}
