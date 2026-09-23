import type { ReactNode } from 'react'

interface ScreenProps {
  children: ReactNode
  /** Center the column horizontally as well (the intro screens). */
  centered?: boolean
}

/**
 * A single full-height moment: one column, vertically centered, one entrance.
 * Used for the intro, sign in, and the final screens.
 */
export function Screen({ children, centered = false }: ScreenProps) {
  return (
    <main
      className={`flex min-h-dvh flex-col items-center justify-center px-6 py-16 sm:px-10 ${
        centered ? 'text-center' : 'text-left'
      }`}
    >
      <div className={`enter w-full max-w-md ${centered ? 'flex flex-col items-center' : ''}`}>{children}</div>
    </main>
  )
}
