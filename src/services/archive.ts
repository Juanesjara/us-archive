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
import { getDb } from '../lib/firebase'
import { compressImage } from '../lib/compress'
import { forgetImage } from '../components/ui/ArchiveImage'
import type { OfficialState } from '../types'

/* ------------------------------------------------------------------------ */
/* Images                                                                   */
/*                                                                          */
/* Stored as compressed JPEG data URLs in images/{id}, one per document,    */
/* so the whole archive runs on the free Spark plan without Cloud Storage.  */
/* ------------------------------------------------------------------------ */

/** Compresses and stores an image. Returns the new images/{id}. */
export async function saveImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) {
    throw new Error('Solo se pueden subir imágenes.')
  }
  const image = await compressImage(file)
  const ref = await addDoc(collection(getDb(), 'images'), {
    data: image.dataUrl,
    width: image.width,
    height: image.height,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function deleteImage(id: string | null | undefined) {
  if (!id) return
  forgetImage(id)
  await deleteDoc(doc(getDb(), 'images', id))
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
