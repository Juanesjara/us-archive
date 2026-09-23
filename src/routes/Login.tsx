import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { hasSeenIntro } from '../lib/onboarding'
import { nameToEmail, normalizeName } from '../lib/username'
import { passkeysAvailable, signInWithPasskey } from '../lib/passkey'
import { Screen } from '../components/ui/Screen'
import { Wordmark } from '../components/ui/Wordmark'
import { TextField } from '../components/ui/Field'
import { Button, Arrow } from '../components/ui/Button'

const messageFor = (code: string | undefined) => {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Ese nombre o contraseña no es correcto.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa la red e inténtalo de nuevo.'
    default:
      return 'No se pudo entrar. Inténtalo de nuevo.'
  }
}

export function Login() {
  const { loading, user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [faceId, setFaceId] = useState(false)
  const [faceIdError, setFaceIdError] = useState<string | null>(null)

  useEffect(() => {
    void passkeysAvailable().then(setFaceId)
  }, [])

  if (loading) return <div className="min-h-dvh" aria-busy="true" />
  if (user) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? (hasSeenIntro() ? '/archive' : '/intro')} replace />
  }

  const onFaceId = async () => {
    setFaceIdError(null)
    setBusy(true)
    try {
      await signInWithPasskey()
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? (hasSeenIntro() ? '/archive' : '/intro'), { replace: true })
    } catch (err) {
      setFaceIdError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      // Passwords are stored in lowercase, so "VESUVIO" or "Vesuvio" work too.
      await signIn(nameToEmail(name), password.trim().toLowerCase())
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? (hasSeenIntro() ? '/archive' : '/intro'), { replace: true })
    } catch (err) {
      setError(messageFor((err as { code?: string }).code))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <Wordmark className="text-display" />
      <p className="mt-3 text-ui text-muted">Privado. Entra para continuar.</p>

      <form onSubmit={onSubmit} className="mt-12 flex w-full flex-col gap-6" noValidate>
        <TextField
          label="Nombre"
          type="text"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />
        <TextField
          label="Contraseña"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          error={error}
        />
        <div className="mt-2">
          <Button type="submit" disabled={busy || !normalizeName(name) || !password}>
            {busy ? 'Entrando' : 'Entrar'} <Arrow />
          </Button>
        </div>
      </form>

      {faceId ? (
        <div className="mt-10 w-full border-t border-rule pt-8">
          <Button variant="quiet" onClick={() => void onFaceId()} disabled={busy}>
            Entrar con Face ID
          </Button>
          {faceIdError ? (
            <p className="mt-2 text-meta text-danger" role="alert">
              {faceIdError}
            </p>
          ) : null}
        </div>
      ) : null}
    </Screen>
  )
}
