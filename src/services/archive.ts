import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore'
import { deleteObject, uploadBytes } from 'firebase/storage'
import { getDb } from '../lib/firebase'
import { encodeImage } from '../lib/compress'
import { forgetImage, imageRef } from '../components/ui/ArchiveImage'
import type { OfficialState } from '../types'

/* ------------------------------------------------------------------------ */
/* Images                                                                   */
/*                                                                          */
/* Stored in Cloud Storage as images/{id}/full.jpg and images/{id}/thumb.jpg */
/* Ids come from Firestore's generator so they look like every other id.    */
/* ------------------------------------------------------------------------ */

// Images never change after upload, so browsers may keep them for a year.
const IMAGE_METADATA = { contentType: 'image/jpeg', cacheControl: 'private, max-age=31536000, immutable' }

/** Re-encodes and uploads an image. Returns its id. */
export async function saveImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
    throw new Error('Solo se pueden subir imágenes.')
  }
  const image = await encodeImage(file)
  const id = doc(collection(getDb(), 'images')).id
  try {
    await Promise.all([
      uploadBytes(imageRef(id, 'full'), image.full, IMAGE_METADATA),
      uploadBytes(imageRef(id, 'thumb'), image.thumb, IMAGE_METADATA),
    ])
  } catch (err) {
    await deleteImage(id).catch(() => undefined)
    if ((err as { code?: string }).code === 'storage/retry-limit-exceeded') {
      throw new Error('No se pudo subir la foto. Revisa la conexión e inténtalo otra vez.')
    }
    throw err
  }
  return id
}

export async function deleteImage(id: string | null | undefined) {
  if (!id) return
  forgetImage(id)
  await Promise.all([
    ...(['full', 'thumb'] as const).map((size) =>
      deleteObject(imageRef(id, size)).catch((err: { code?: string }) => {
        if (err.code !== 'storage/object-not-found') throw err
      }),
    ),
    // Photos from before the move to Storage also have a copy in Firestore.
    deleteDoc(doc(getDb(), 'images', id)),
  ])
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                  */
/* ------------------------------------------------------------------------ */

/** Firestore rejects undefined values; drop them and trim strings. */
const clean = <T extends Record<string, unknown>>(data: T): Partial<T> => {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue
    if (typeof v === 'string') {
      const t = v.trim()
      if (t === '') continue
      out[k] = t
    } else {
      out[k] = v
    }
  }
  return out as Partial<T>
}

/** Runs a write that references a freshly saved image; removes the image if the write fails. */
async function withImage<T>(file: File | null | undefined, write: (imageId: string | null) => Promise<T>) {
  const imageId = file ? await saveImage(file) : null
  try {
    return await write(imageId)
  } catch (err) {
    if (imageId) await deleteImage(imageId).catch(() => undefined)
    throw err
  }
}

/* ------------------------------------------------------------------------ */
/* Photos                                                                   */
/* ------------------------------------------------------------------------ */

export interface PhotoInput {
  date: Timestamp
  hasTime: boolean
  caption?: string
  location?: string
  city?: string | null
  lat?: number | null
  lng?: number | null
}

export async function addPhoto(file: File, input: PhotoInput) {
  await withImage(file, (imageId) =>
    addDoc(collection(getDb(), 'photos'), {
      ...clean({ caption: input.caption, location: input.location, city: input.city ?? undefined }),
      ...(input.lat != null && input.lng != null ? { lat: input.lat, lng: input.lng } : {}),
      date: input.date,
      hasTime: input.hasTime,
      imageId,
      createdAt: serverTimestamp(),
    }),
  )
}

/** The only field edited after upload: an optional description. Empty clears it. */
export async function setPhotoCaption(id: string, caption: string) {
  await updateDoc(doc(getDb(), 'photos', id), { caption: caption.trim() || null })
}

/** Admin edits after upload: description, and the date and time the photo was taken. */
export async function updatePhotoDetails(id: string, input: { caption: string; date: Timestamp; hasTime: boolean }) {
  await updateDoc(doc(getDb(), 'photos', id), {
    caption: input.caption.trim() || null,
    date: input.date,
    hasTime: input.hasTime,
  })
}

/** Firestore keeps subcollections when a document is deleted, so comments go first. */
export async function deletePhoto(id: string, imageId: string) {
  const comments = await getDocs(collection(getDb(), 'photos', id, 'comments'))
  await Promise.all(comments.docs.map((c) => deleteDoc(c.ref)))
  await deleteDoc(doc(getDb(), 'photos', id))
  await deleteImage(imageId)
}

/* ------------------------------------------------------------------------ */
/* Comments                                                                 */
/* ------------------------------------------------------------------------ */

export async function addComment(photoId: string, author: { uid: string; name: string }, text: string) {
  await addDoc(collection(getDb(), 'photos', photoId, 'comments'), {
    uid: author.uid,
    name: author.name,
    text: text.trim(),
    createdAt: serverTimestamp(),
  })
}

export async function deleteComment(photoId: string, id: string) {
  await deleteDoc(doc(getDb(), 'photos', photoId, 'comments', id))
}

/* ------------------------------------------------------------------------ */
/* Official state                                                           */
/* ------------------------------------------------------------------------ */

export const OFFICIAL_PATH = 'settings/official'

export async function saveOfficial(
  state: Pick<OfficialState, 'active' | 'date' | 'caption'>,
  photo: File | null | undefined,
  previous: OfficialState | null,
) {
  await withImage(photo, async (photoId) => {
    const patch: Record<string, unknown> = {
      active: state.active,
      date: state.date,
      caption: state.caption?.trim() || 'Primer recuerdo oficial.',
    }
    if (photoId) patch.photoId = photoId
    await setDoc(doc(getDb(), OFFICIAL_PATH), patch, { merge: true })
  })
  if (photo && previous?.photoId) await deleteImage(previous.photoId)
}

export async function removeOfficialPhoto(previous: OfficialState | null) {
  await setDoc(doc(getDb(), OFFICIAL_PATH), { photoId: null }, { merge: true })
  await deleteImage(previous?.photoId)
}
