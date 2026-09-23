import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { getDb, getFirebaseAuth, isConfigured } from '../lib/firebase'
import type { Member } from '../types'

interface AuthState {
  /** true until Firebase has reported the initial auth state and member doc. */
  loading: boolean
  user: User | null
  /** null when signed out or when the account has no members/{uid} document. */
  member: Member | null
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  // Without config there is nothing to wait for; RequireConfig blocks rendering anyway.
  const [authReady, setAuthReady] = useState(!isConfigured)
  const [memberReady, setMemberReady] = useState(!isConfigured)

  useEffect(() => {
    if (!isConfigured) return
    return onAuthStateChanged(getFirebaseAuth(), (next) => {
      setUser(next)
      setAuthReady(true)
      if (!next) {
        setMember(null)
        setMemberReady(true)
      } else {
        setMemberReady(false)
      }
    })
  }, [])

  useEffect(() => {
    if (!user) return
    const ref = doc(getDb(), 'members', user.uid)
    return onSnapshot(
      ref,
      (snap) => {
        setMember(snap.exists() ? (snap.data() as Member) : null)
        setMemberReady(true)
      },
      () => {
        setMember(null)
        setMemberReady(true)
      },
    )
  }, [user])

  const value: AuthState = {
    loading: !authReady || !memberReady,
    user,
    member,
    isAdmin: member?.role === 'admin',
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password)
    },
    signOut: async () => {
      await signOut(getFirebaseAuth())
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
