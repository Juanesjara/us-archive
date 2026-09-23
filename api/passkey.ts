/**
 * Face ID sign-in (passkeys / WebAuthn).
 *
 * One endpoint, POST /api/passkey with { action }:
 *   status            -> { enabled } whether the server has Firebase Admin credentials
 *   register-options  -> (signed in) options for creating a passkey on this device
 *   register-verify   -> (signed in) stores the new passkey for the signed-in user
 *   login-options     -> options for signing in with any saved passkey
 *   login-verify      -> checks the signature and returns a Firebase custom token
 *
 * Credentials and one-time challenges live in Firestore collections that the
 * client rules deny entirely (passkeys, passkeyChallenges). Only this function,
 * using the Admin SDK, can read or write them.
 *
 * Requires the FIREBASE_SERVICE_ACCOUNT env var (the service account JSON).
 * Without it, status reports enabled: false and the UI hides the Face ID buttons.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Auth } from 'firebase-admin/auth'
import type { Firestore } from 'firebase-admin/firestore'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'

const CHALLENGE_TTL_MS = 5 * 60 * 1000
const PRIMARY_DOMAIN = 'alejayjuanesgallery.site'

/* ------------------------------------------------------------------------ */
/* Firebase Admin                                                           */
/* ------------------------------------------------------------------------ */

/*
 * firebase-admin is loaded lazily, only when credentials exist, so the status
 * check can never fail because of the Admin SDK or its dependencies.
 */
type FirestoreModule = typeof import('firebase-admin/firestore')
let admin: Promise<{ auth: Auth; db: Firestore; fs: FirestoreModule } | null> | null = null

function loadAdmin() {
  admin ??= (async () => {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!raw) return null
    const { cert, getApps, initializeApp } = await import('firebase-admin/app')
    const app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(raw)) })
    const { getAuth } = await import('firebase-admin/auth')
    const fs = await import('firebase-admin/firestore')
    return { auth: getAuth(app), db: fs.getFirestore(app), fs }
  })().catch((err) => {
    console.error('[passkey] admin init failed', err)
    admin = null
    return null
  })
  return admin
}

async function need() {
  const a = await loadAdmin()
  if (!a) throw new HttpError(503, 'Face ID no está configurado en el servidor.')
  return a
}

/* ------------------------------------------------------------------------ */
/* Relying party: which site the passkey belongs to                          */
/* ------------------------------------------------------------------------ */

function relyingParty(req: VercelRequest) {
  const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '').split(',')[0].trim()
  const hostname = host.split(':')[0]
  const local = hostname === 'localhost' || hostname === '127.0.0.1'
  const origin = `${local ? 'http' : 'https'}://${host}`
  // Passkeys for the custom domain work on both the apex and www.
  const rpID = hostname === PRIMARY_DOMAIN || hostname.endsWith(`.${PRIMARY_DOMAIN}`) ? PRIMARY_DOMAIN : hostname
  return { rpID, origin }
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                  */
/* ------------------------------------------------------------------------ */

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

async function requireUser(req: VercelRequest) {
  const header = String(req.headers.authorization ?? '')
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) throw new HttpError(401, 'Inicia sesión primero.')
  try {
    return await (await need()).auth.verifyIdToken(token)
  } catch {
    throw new HttpError(401, 'La sesión expiró. Vuelve a entrar.')
  }
}

async function isMember(uid: string) {
  const snap = await (await need()).db.doc(`members/${uid}`).get()
  return snap.exists
}

async function saveChallenge(challenge: string, kind: 'register' | 'login', uid?: string) {
  const { db, fs } = await need()
  const ref = db.collection('passkeyChallenges').doc()
  await ref.set({
    challenge,
    kind,
    uid: uid ?? null,
    expiresAt: fs.Timestamp.fromMillis(Date.now() + CHALLENGE_TTL_MS),
  })
  return ref.id
}

/** Reads and deletes a challenge in one go, so it can only be used once. */
async function takeChallenge(id: unknown, kind: 'register' | 'login', uid?: string) {
  if (typeof id !== 'string' || !id) throw new HttpError(400, 'Falta el desafío.')
  const { db } = await need()
  const ref = db.collection('passkeyChallenges').doc(id)
  const data = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return null
    tx.delete(ref)
    return snap.data() as { challenge: string; kind: string; uid: string | null; expiresAt: { toMillis(): number } }
  })
  if (!data || data.kind !== kind || data.expiresAt.toMillis() < Date.now()) {
    throw new HttpError(400, 'El intento expiró. Inténtalo de nuevo.')
  }
  if (uid && data.uid !== uid) throw new HttpError(400, 'El intento no corresponde a esta sesión.')
  return data.challenge
}

interface StoredPasskey {
  uid: string
  publicKey: string
  counter: number
  transports?: string[]
  rpID: string
  device?: string
}

/* ------------------------------------------------------------------------ */
/* Actions                                                                  */
/* ------------------------------------------------------------------------ */

async function registerOptions(req: VercelRequest) {
  const user = await requireUser(req)
  if (!(await isMember(user.uid))) throw new HttpError(403, 'Esta cuenta no está en la lista.')
  const { rpID } = relyingParty(req)
  const existing = await (await need()).db.collection('passkeys').where('uid', '==', user.uid).get()
  const name = (user.email ?? user.uid).split('@')[0]

  const options = await generateRegistrationOptions({
    rpName: 'us.',
    rpID,
    userName: name,
    userDisplayName: name,
    userID: new TextEncoder().encode(user.uid),
    attestationType: 'none',
    excludeCredentials: existing.docs
      .filter((d) => (d.data() as StoredPasskey).rpID === rpID)
      .map((d) => ({ id: d.id, transports: (d.data() as StoredPasskey).transports })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
      authenticatorAttachment: 'platform',
    },
  })
  const challengeId = await saveChallenge(options.challenge, 'register', user.uid)
  return { options, challengeId }
}

async function registerVerify(req: VercelRequest) {
  const user = await requireUser(req)
  const { challengeId, response, device } = req.body as {
    challengeId: unknown
    response: RegistrationResponseJSON
    device?: string
  }
  const expectedChallenge = await takeChallenge(challengeId, 'register', user.uid)
  const { rpID, origin } = relyingParty(req)

  const result = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  })
  if (!result.verified) throw new HttpError(400, 'No se pudo verificar el Face ID.')

  const { credential } = result.registrationInfo
  const stored: StoredPasskey = {
    uid: user.uid,
    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ?? [],
    rpID,
    device: typeof device === 'string' ? device.slice(0, 80) : undefined,
  }
  const { db, fs } = await need()
  await db
    .collection('passkeys')
    .doc(credential.id)
    .set({ ...stored, createdAt: fs.FieldValue.serverTimestamp() })
  return { ok: true }
}

async function loginOptions(req: VercelRequest) {
  const { rpID } = relyingParty(req)
  // No allowCredentials: the phone offers whichever passkey it has for this site.
  const options = await generateAuthenticationOptions({ rpID, userVerification: 'required' })
  const challengeId = await saveChallenge(options.challenge, 'login')
  return { options, challengeId }
}

async function loginVerify(req: VercelRequest) {
  const { challengeId, response } = req.body as { challengeId: unknown; response: AuthenticationResponseJSON }
  const expectedChallenge = await takeChallenge(challengeId, 'login')
  if (!response?.id) throw new HttpError(400, 'Respuesta incompleta.')

  const { db, fs, auth } = await need()
  const ref = db.collection('passkeys').doc(response.id)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpError(404, 'Este Face ID no está registrado. Entra con tu contraseña y actívalo de nuevo.')
  const stored = snap.data() as StoredPasskey
  const { rpID, origin } = relyingParty(req)

  const result = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: {
      id: snap.id,
      publicKey: isoBase64URL.toBuffer(stored.publicKey),
      counter: stored.counter,
      transports: stored.transports as never,
    },
  })
  if (!result.verified) throw new HttpError(401, 'No se pudo verificar el Face ID.')
  if (!(await isMember(stored.uid))) throw new HttpError(403, 'Esta cuenta no está en la lista.')

  await ref.update({ counter: result.authenticationInfo.newCounter, lastUsedAt: fs.FieldValue.serverTimestamp() })
  const token = await auth.createCustomToken(stored.uid)
  return { token }
}

/* ------------------------------------------------------------------------ */
/* Handler                                                                  */
/* ------------------------------------------------------------------------ */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  const configured = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT)
  const action = req.method === 'GET' ? 'status' : (req.body as { action?: string } | undefined)?.action

  if (action === 'status') return res.status(200).json({ enabled: configured })
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' })
  if (!configured) return res.status(503).json({ error: 'Face ID no está configurado en el servidor.' })

  try {
    switch (action) {
      case 'register-options':
        return res.status(200).json(await registerOptions(req))
      case 'register-verify':
        return res.status(200).json(await registerVerify(req))
      case 'login-options':
        return res.status(200).json(await loginOptions(req))
      case 'login-verify':
        return res.status(200).json(await loginVerify(req))
      default:
        return res.status(400).json({ error: 'Acción desconocida.' })
    }
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message })
    console.error('[passkey]', err)
    return res.status(500).json({ error: 'Algo salió mal. Inténtalo de nuevo.' })
  }
}
