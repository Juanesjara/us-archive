import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'

type Variant = 'primary' | 'quiet' | 'danger'

const base =
  'inline-flex items-center justify-center gap-2 rounded-full text-ui font-medium transition-[background-color,color,opacity] duration-200 disabled:opacity-40 disabled:pointer-events-none select-none'

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-paper px-5 py-2.5 hover:bg-body',
  quiet: 'text-ink px-3 py-2 -mx-3 hover:text-muted',
  danger: 'text-danger px-3 py-2 -mx-3 hover:opacity-70',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

export function Button({ variant = 'primary', className = '', children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}

interface LinkButtonProps {
  to: string
  variant?: Variant
  className?: string
  children: ReactNode
  replace?: boolean
}

export function LinkButton({ to, variant = 'primary', className = '', children, replace }: LinkButtonProps) {
  return (
    <Link to={to} replace={replace} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  )
}

/** The arrow the brief asks for on every forward action. */
export const Arrow = () => (
  <span aria-hidden="true" className="translate-y-px">
    →
  </span>
)
