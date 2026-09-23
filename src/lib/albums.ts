import type { Photo } from '../types'
import { toDate, toInputDate } from './format'

export interface Album {
  key: string
  /** Any moment inside the album's day, for formatting the heading. */
  day: Date
  /** City or place shared by the photos, if any. */
  place: string | null
  /** Oldest first, the order the day happened in. */
  photos: Photo[]
}

const placeOf = (p: Photo) => p.city?.trim() || p.location?.trim() || null

/**
 * Groups photos into albums by local calendar day and city.
 * Albums are newest first; photos inside each album run oldest first.
 */
export function groupIntoAlbums(photos: Photo[]): Album[] {
  const map = new Map<string, Album>()
  for (const photo of photos) {
    const d = toDate(photo.date)
    if (!d) continue
    const place = placeOf(photo)
    const key = `${toInputDate(d)}|${(place ?? '').toLowerCase()}`
    let album = map.get(key)
    if (!album) {
      album = { key, day: d, place, photos: [] }
      map.set(key, album)
    }
    album.photos.push(photo)
  }

  const time = (p: Photo) => toDate(p.date)?.getTime() ?? 0
  const albums = [...map.values()]
  for (const a of albums) a.photos.sort((x, y) => time(x) - time(y))
  albums.sort((x, y) => time(y.photos[0]) - time(x.photos[0]))
  return albums
}
