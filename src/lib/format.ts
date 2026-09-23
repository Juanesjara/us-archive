import { Timestamp } from 'firebase/firestore'

const monthYear = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' })
const full = new Intl.DateTimeFormat('es-CO', { month: 'long', day: 'numeric', year: 'numeric' })
const short = new Intl.DateTimeFormat('es-CO', { month: 'short', day: 'numeric', year: 'numeric' })

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

export const toDate = (value: Timestamp | Date | null | undefined): Date | null => {
  if (!value) return null
  return value instanceof Timestamp ? value.toDate() : value
}

export const formatMonthYear = (value: Timestamp | Date | null | undefined) => {
  const d = toDate(value)
  return d ? capitalize(monthYear.format(d)) : ''
}

export const formatFull = (value: Timestamp | Date | null | undefined) => {
  const d = toDate(value)
  return d ? full.format(d) : ''
}

export const formatShort = (value: Timestamp | Date | null | undefined) => {
  const d = toDate(value)
  return d ? short.format(d) : ''
}

/** yyyy-mm-dd for a date input, in local time. */
export const toInputDate = (value: Timestamp | Date | null | undefined) => {
  const d = toDate(value)
  if (!d) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse yyyy-mm-dd as local noon so the calendar day survives timezone shifts. */
export const fromInputDate = (value: string): Timestamp | null => {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0))
}

export const todayInputDate = () => toInputDate(new Date())

const time = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' })

export const formatTime = (value: Timestamp | Date | null | undefined) => {
  const d = toDate(value)
  return d ? time.format(d) : ''
}

/** hh:mm for a time input, in local time. */
export const toInputTime = (value: Timestamp | Date | null | undefined) => {
  const d = toDate(value)
  if (!d) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Combine a yyyy-mm-dd date and an optional hh:mm time. Without a time, uses local noon. */
export const fromInputDateTime = (date: string, clock: string): Timestamp | null => {
  const day = fromInputDate(date)
  if (!day || !clock) return day
  const [h, m] = clock.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return day
  const d = day.toDate()
  d.setHours(h, m, 0, 0)
  return Timestamp.fromDate(d)
}
