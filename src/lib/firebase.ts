import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const

const env = import.meta.env as Record<string, string | undefined>

/** Names of env vars that are missing. Empty when the app is fully configured. */
export const missingConfig: string[] = REQUIRED.filter((key) => !env[key])

export const isConfigured = missingConfig.length === 0

let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined

if (isConfigured) {
  app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  })
  auth = getAuth(app)
  db = getFirestore(app)
}

function required<T>(value: T | undefined, name: string): T {
  if (!value) {
    throw new Error(`Firebase is not configured (${name}). Missing: ${missingConfig.join(', ')}`)
  }
  return value
}

export const getFirebaseAuth = () => required(auth, 'auth')
export const getDb = () => required(db, 'firestore')
