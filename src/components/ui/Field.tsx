import type { InputHTMLAttributes } from 'react'
import { useId } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | null
}

export function TextField({ label, error, className = '', ...rest }: TextFieldProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-meta text-muted">
        {label}
      </label>
      <input id={id} aria-invalid={error ? 'true' : undefined} className={`field ${className}`} {...rest} />
      {error ? (
        <p className="text-meta text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
