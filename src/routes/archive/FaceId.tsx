import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Button'
import { enablePasskey, passkeyEnabledHere } from '../../lib/passkey'

/** /archive/face-id. Turns on Face ID sign-in for this phone. */
export function FaceId() {
  const [enabled, setEnabled] = useState(passkeyEnabledHere)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activate = async () => {
    setBusy(true)
    setError(null)
    try {
      await enablePasskey()
      setEnabled(true)
    } catch (err) {
      if ((err as Error).message === 'Face ID ya está activado en este celular.') setEnabled(true)
      else setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="enter max-w-md">
      <h1 className="serif text-title text-ink">Face ID</h1>
      {enabled ? (
        <>
          <p className="serif mt-6 text-prose text-body">Face ID ya está activado en este celular.</p>
          <p className="mt-3 text-ui text-muted">
            La próxima vez, en la pantalla de entrada, toca "Entrar con Face ID" y listo.
          </p>
        </>
      ) : (
        <>
          <p className="serif mt-6 text-prose text-body">Entra sin escribir tu contraseña.</p>
          <p className="mt-3 text-ui text-muted">
            Actívalo una vez en este celular. Después, en la pantalla de entrada, toca "Entrar con Face ID".
          </p>
          <div className="mt-10">
            <Button onClick={() => void activate()} disabled={busy}>
              {busy ? 'Activando' : 'Activar Face ID'}
            </Button>
          </div>
          {error ? (
            <p className="mt-4 text-meta text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </>
      )}
      <Link to="/archive" className="mt-12 inline-block text-meta text-muted hover:text-ink">
        Volver al archivo
      </Link>
    </div>
  )
}
