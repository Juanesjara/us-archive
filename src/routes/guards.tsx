import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { hasSeenIntro } from '../lib/onboarding'
import { emailToName } from '../lib/username'
import { isConfigured, missingConfig } from '../lib/firebase'
import { Screen } from '../components/ui/Screen'
import { Button } from '../components/ui/Button'
import { Wordmark } from '../components/ui/Wordmark'

/** Shown instead of the app when the Firebase env vars are missing. */
export function NotConfigured() {
  return (
    <Screen>
      <Wordmark className="text-display" />
      <p className="serif mt-8 text-lead text-ink">Firebase todavía no está configurado.</p>
      <p className="mt-3 text-ui text-muted">
        Copia <code className="text-ink">.env.example</code> a <code className="text-ink">.env</code>, llena estos
        valores y reinicia el servidor de desarrollo:
      </p>
      <ul className="mt-4 space-y-1 text-meta text-muted">
        {missingConfig.map((k) => (
          <li key={k}>
            <code>{k}</code>
          </li>
        ))}
      </ul>
    </Screen>
  )
}

export function RequireConfig({ children }: { children: ReactNode }) {
  if (!isConfigured) return <NotConfigured />
  return <>{children}</>
}

/** Signed in, but the account has no members/{uid} document. */
function NoAccess() {
  const { user, signOut } = useAuth()
  return (
    <Screen>
      <Wordmark className="text-display" />
      <p className="serif mt-8 text-lead text-ink">Esta cuenta no está en la lista.</p>
      <p className="mt-3 text-ui text-muted">
        Entraste como {emailToName(user?.email)}, pero este archivo es privado para dos personas.
      </p>
      <div className="mt-8">
        <Button variant="quiet" onClick={() => void signOut()}>
          Salir
        </Button>
      </div>
    </Screen>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, user, member } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-dvh" aria-busy="true" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!member) return <NoAccess />
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/archive" replace />
  return <>{children}</>
}

/** The archive is only reached after the intro has been seen once on this device. */
export function RequireIntro({ children }: { children: ReactNode }) {
  if (!hasSeenIntro()) return <Navigate to="/intro" replace />
  return <>{children}</>
}

/** Where "/" goes, depending on state. */
export function Root() {
  const { loading, user } = useAuth()
  if (loading) return <div className="min-h-dvh" aria-busy="true" />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={hasSeenIntro() ? '/archive' : '/intro'} replace />
}
