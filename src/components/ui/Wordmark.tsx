interface WordmarkProps {
  className?: string
}

/** "us." set in italic serif. The period is the accent, rendered by CSS. */
export function Wordmark({ className = '' }: WordmarkProps) {
  return (
    <span className={`wordmark ${className}`} aria-label="us.">
      us
    </span>
  )
}
