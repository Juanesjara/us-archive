import { platformAuthenticatorIsAvailable, startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { signInWithCustomToken } from 'firebase/auth'
import { getFirebaseAuth } from './firebase'

/*
 * Face ID sign-in through passkeys. The server side lives in api/passkey.ts.
 * The buttons only show when both the device (Face ID / Touch ID / Windows Hello)
 * and the server (Firebase Admin credentials configured) support it.
 */

const ENABLED_KEY = 'us.passkey.enabled'

async function call<T>(action: string, body: Record<string, unknown> = {}, idToken?: string): Promise<T> {
  const res = await fetch('/api/passkey', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ action, ...body }),
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(data.error ?? 'No se pudo completar. Inténtalo de nuevo.')
  return data
}

let availability: Promise<boolean> | null = null

/** true when this device has Face ID (or similar) and the server is configured. */
export function passkeysAvailable(): Promise<boolean> {
  availability ??= (async () => {
    try {
      if (!(await platformAuthenticatorIsAvailable())) return false
      const res = await fetch('/api/passkey', { method: 'GET' })
      if (!res.ok) return false
      return Boolean(((await res.json()) as { enabled?: boolean }).enabled)
    } catch {
      return false
    }
  })()
  return availability
}

/** Friendly message for the errors people actually hit. */
function explain(err: unknown): Error {
  const name = (err as { name?: string })?.name
  if (name === 'NotAllowedError' || name === 'AbortError') return new Error('Se canceló.')
  if (name === 'InvalidStateError') return new Error('Face ID ya está activado en este celular.')
  return err instanceof Error ? err : new Error('No se pudo completar. Inténtalo de nuevo.')
}

/** Registers Face ID for the signed-in user on this device. */
export async function enablePasskey(): Promise<void> {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new Error('Inicia sesión primero.')
  const idToken = await user.getIdToken()
  try {
    const { options, challengeId } = await call<{ options: never; challengeId: string }>('register-options', {}, idToken)
    const response = await startRegistration({ optionsJSON: options })
    await call('register-verify', { challengeId, response, device: navigator.userAgent }, idToken)
    try {
      localStorage.setItem(ENABLED_KEY, '1')
    } catch {
      // Only affects the "already enabled" hint.
    }
  } catch (err) {
    const e = explain(err)
    if (e.message === 'Face ID ya está activado en este celular.') {
      try {
        localStorage.setItem(ENABLED_KEY, '1')
      } catch {
        // ignore
      }
    }
    throw e
  }
}

/** Signs in with whichever passkey this device holds for the site. */
export async function signInWithPasskey(): Promise<void> {
  try {
    const { options, challengeId } = await call<{ options: never; challengeId: string }>('login-options')
    const response = await startAuthentication({ optionsJSON: options })
    const { token } = await call<{ token: string }>('login-verify', { challengeId, response })
    await signInWithCustomToken(getFirebaseAuth(), token)
  } catch (err) {
    throw explain(err)
  }
}

export function passkeyEnabledHere(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) === '1'
  } catch {
    return false
  }
}
