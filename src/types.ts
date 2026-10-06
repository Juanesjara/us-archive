import type { Timestamp } from 'firebase/firestore'

export type Role = 'admin' | 'member'

export interface Member {
  role: Role
  name?: string
}

export interface Photo {
  id: string
  /** Cloud Storage images/{imageId}/full.jpg and thumb.jpg. */
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

/** A photo that carries coordinates, so it can go on the map. */
export type Located = Photo & { lat: number; lng: number }

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
