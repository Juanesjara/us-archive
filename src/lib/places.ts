import type { Photo } from '../types'
import { toDate } from './format'

export interface PlaceArea {
  /** Neighbourhood or spot inside the place, e.g. "La Magnolia". Null when only the city is known. */
  name: string | null
  /** Newest first. */
  photos: Photo[]
}

export interface PlaceGroup {
  /** URL-safe identifier. */
  slug: string
  /** City or town, e.g. "Envigado". */
  name: string
  /** Newest first. */
  photos: Photo[]
  areas: PlaceArea[]
  first: Date
  last: Date
}

const time = (p: Photo) => toDate(p.date)?.getTime() ?? 0

const cityOf = (p: Photo): string | null => {
  if (p.city?.trim()) return p.city.trim()
  // Older photos may only carry the label "Area, City".
  const label = p.location?.trim()
  if (!label) return null
  const parts = label.split(',').map((s) => s.trim()).filter(Boolean)
  return parts[parts.length - 1] ?? null
}

const areaOf = (p: Photo, city: string): string | null => {
  const label = p.location?.trim()
  if (!label) return null
  const area = label
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s.toLowerCase() !== city.toLowerCase())
    .join(', ')
  return area || null
}

export const placeSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Groups photos that have a location into places (city or town), each split
 * into areas (neighbourhoods). Places are ordered by how many photos they hold,
 * then by most recent visit. Photos without a location are left out.
 */
export function groupByPlace(photos: Photo[]): PlaceGroup[] {
  const places = new Map<string, { name: string; photos: Photo[] }>()
  for (const photo of photos) {
    const city = cityOf(photo)
    if (!city) continue
    const slug = placeSlug(city)
    const entry = places.get(slug) ?? { name: city, photos: [] }
    entry.photos.push(photo)
    places.set(slug, entry)
  }

  const groups: PlaceGroup[] = []
  for (const [slug, { name, photos: list }] of places) {
    list.sort((a, b) => time(b) - time(a))
    const areas = new Map<string, PlaceArea>()
    for (const photo of list) {
      const area = areaOf(photo, name)
      const key = area?.toLowerCase() ?? ''
      const entry = areas.get(key) ?? { name: area, photos: [] }
      entry.photos.push(photo)
      areas.set(key, entry)
    }
    // Named areas by size first; photos with only the city known go last.
    const sortedAreas = [...areas.values()].sort((a, b) => {
      if (!a.name !== !b.name) return a.name ? -1 : 1
      return b.photos.length - a.photos.length
    })
    groups.push({
      slug,
      name,
      photos: list,
      areas: sortedAreas,
      first: toDate(list[list.length - 1].date) ?? new Date(),
      last: toDate(list[0].date) ?? new Date(),
    })
  }

  return groups.sort((a, b) => b.photos.length - a.photos.length || b.last.getTime() - a.last.getTime())
}
