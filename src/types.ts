import type { Timestamp } from 'firebase/firestore'

export type Role = 'admin' | 'member'

/** images/{id}. Kept apart from the metadata so lists and counts stay light. */
export interface StoredImage {
  data: string
  width: number
  height: number
}

export interface Member {
  role: Role
  name?: string
}

export interface Photo {
  id: string
  /** images/{imageId}: the compressed JPEG, stored as a data URL. */
  imageId: string
  /** When the photo was taken. Date-only photos are stored at local noon. */
  date: Timestamp
  /** true when date carries a real time of day (read from the photo or typed in). */
  hasTime?: boolean
  caption?: string
  /** Display label, e.g. "El Poblado, Medellín". */
  location?: string
  /** Town or city, used to group photos into albums. */
  city?: string
  lat?: number
  lng?: number
  createdAt?: Timestamp
}

/** photos/{photoId}/comments/{id}. name is copied at write time so reading needs no lookup. */
export interface Comment {
  id: string
  uid: string
  name: string
  text: string
  /** null in the local snapshot until the server confirms the write. */
  createdAt: Timestamp | null
}

/** settings/official: the state switched on after the question is asked in person. */
export interface OfficialState {
  active: boolean
  date: Timestamp | null
  photoId?: string | null
  caption?: string
}
