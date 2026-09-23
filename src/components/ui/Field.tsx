import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useId } from 'react'

interface LabelProps {
  label: string
  hint?: string
  error?: string | null
  children: (id: string) => ReactNode
}

function Labelled({ label, hint, error, children }: LabelProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-meta text-muted">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="text-meta text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-meta text-faint">{hint}</p>
      ) : null}
    </div>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string | null
}

export function TextField({ label, hint, error, className = '', ...rest }: TextFieldProps) {
  return (
    <Labelled label={label} hint={hint} error={error}>
      {(id) => <input id={id} aria-invalid={error ? 'true' : undefined} className={`field ${className}`} {...rest} />}
    </Labelled>
  )
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string | null
}

export function TextArea({ label, hint, error, className = '', ...rest }: TextAreaProps) {
  return (
    <Labelled label={label} hint={hint} error={error}>
      {(id) => <textarea id={id} aria-invalid={error ? 'true' : undefined} className={`field ${className}`} {...rest} />}
    </Labelled>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
  error?: string | null
  options: { value: string; label: string }[]
}

export function SelectField({ label, hint, error, options, className = '', ...rest }: SelectProps) {
  return (
    <Labelled label={label} hint={hint} error={error}>
      {(id) => (
        <select id={id} className={`field ${className}`} {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Labelled>
  )
}
