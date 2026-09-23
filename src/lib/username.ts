/**
 * Sign-in is by name, not email. Firebase Email/Password auth still needs an
 * email-shaped identifier, so each name maps to a private internal address on
 * a domain nobody receives mail for. Nothing is ever sent to it and it never
 * appears in the interface.
 */
const DOMAIN = 'members.us-archive.app'

export const normalizeName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9._-]/g, '')

export const nameToEmail = (name: string) => `${normalizeName(name)}@${DOMAIN}`

export const emailToName = (email: string | null | undefined) => (email ? email.split('@')[0] : '')
