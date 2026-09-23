import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import { compressImage } from '../lib/compress'
import { forgetImage } from '../components/ui/ArchiveImage'
import type { OfficialState, ThingCategory } from '../types'

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
  caption?: string
  location?: string
}

export async function addPhoto(file: File, input: PhotoInput) {
  await withImage(file, (imageId) =>
    addDoc(collection(getDb(), 'photos'), {
      ...clean({ caption: input.caption, location: input.location }),
      date: input.date,
      imageId,
      createdAt: serverTimestamp(),
    }),
  )
}

export async function updatePhoto(id: string, input: PhotoInput) {
  await updateDoc(doc(getDb(), 'photos', id), {
    date: input.date,
    caption: input.caption?.trim() || null,
    location: input.location?.trim() || null,
  })
}

export async function deletePhoto(id: string, imageId: string) {
  await deleteDoc(doc(getDb(), 'photos', id))
  await deleteImage(imageId)
}

/* ------------------------------------------------------------------------ */
/* Memories                                                                 */
/* ------------------------------------------------------------------------ */

export interface MemoryInput {
  date: Timestamp
  title: string
  description?: string
  location?: string
}

export async function addMemory(input: MemoryInput, photo?: File | null) {
  await withImage(photo, (photoId) =>
    addDoc(collection(getDb(), 'memories'), {
      ...clean({ description: input.description, location: input.location }),
      title: input.title.trim(),
      date: input.date,
      ...(photoId ? { photoId } : {}),
      createdAt: serverTimestamp(),
    }),
  )
}

export async function updateMemory(
  id: string,
  input: MemoryInput,
  photo: File | null | undefined,
  previousPhotoId: string | null | undefined,
  removePhoto: boolean,
) {
  await withImage(photo, async (photoId) => {
    const patch: Record<string, unknown> = {
      title: input.title.trim(),
      date: input.date,
      description: input.description?.trim() || null,
      location: input.location?.trim() || null,
    }
    if (photoId) patch.photoId = photoId
    else if (removePhoto) patch.photoId = null
    await updateDoc(doc(getDb(), 'memories', id), patch)
  })
  if ((photo || removePhoto) && previousPhotoId) await deleteImage(previousPhotoId)
}

export async function deleteMemory(id: string, photoId?: string | null) {
  await deleteDoc(doc(getDb(), 'memories', id))
  await deleteImage(photoId)
}

/* ------------------------------------------------------------------------ */
/* Places                                                                   */
/* ------------------------------------------------------------------------ */

export interface PlaceInput {
  name: string
  date: Timestamp
  note?: string
}

export async function addPlace(input: PlaceInput, photo?: File | null) {
  await withImage(photo, (photoId) =>
    addDoc(collection(getDb(), 'places'), {
      ...clean({ note: input.note }),
      name: input.name.trim(),
      date: input.date,
      ...(photoId ? { photoId } : {}),
      createdAt: serverTimestamp(),
    }),
  )
}

export async function updatePlace(id: string, input: PlaceInput) {
  await updateDoc(doc(getDb(), 'places', id), {
    name: input.name.trim(),
    date: input.date,
    note: input.note?.trim() || null,
  })
}

export async function deletePlace(id: string, photoId?: string | null) {
  await deleteDoc(doc(getDb(), 'places', id))
  await deleteImage(photoId)
}

/* ------------------------------------------------------------------------ */
/* Things                                                                   */
/* ------------------------------------------------------------------------ */

export interface ThingInput {
  title: string
  category: ThingCategory
  note?: string
  date?: Timestamp | null
}

export async function addThing(input: ThingInput) {
  await addDoc(collection(getDb(), 'things'), {
    ...clean({ note: input.note }),
    title: input.title.trim(),
    category: input.category,
    ...(input.date ? { date: input.date } : {}),
    createdAt: serverTimestamp(),
  })
}

export async function updateThing(id: string, input: ThingInput) {
  await updateDoc(doc(getDb(), 'things', id), {
    title: input.title.trim(),
    category: input.category,
    note: input.note?.trim() || null,
    date: input.date ?? null,
  })
}

export async function deleteThing(id: string) {
  await deleteDoc(doc(getDb(), 'things', id))
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
