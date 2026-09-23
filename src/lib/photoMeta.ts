import exifr from 'exifr'

/**
 * Reads what an iPhone (or any camera) stores inside a photo: when it was
 * taken and where. Must run on the original file, before compression, since
 * re-encoding through a canvas drops all metadata.
 */
export interface PhotoMeta {
  /** Local time the photo was taken, as the camera recorded it. */
  takenAt: Date | null
  lat: number | null
  lng: number | null
}

export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
  try {
    const data = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef'],
      gps: true,
    })
    if (!data) return { takenAt: null, lat: null, lng: null }
    const raw = data.DateTimeOriginal ?? data.CreateDate ?? null
    const takenAt = raw instanceof Date && !Number.isNaN(raw.getTime()) ? raw : null
    const lat = typeof data.latitude === 'number' && Number.isFinite(data.latitude) ? data.latitude : null
    const lng = typeof data.longitude === 'number' && Number.isFinite(data.longitude) ? data.longitude : null
    return { takenAt, lat, lng }
  } catch {
    return { takenAt: null, lat: null, lng: null }
  }
}

/* ------------------------------------------------------------------------ */
/* Reverse geocoding                                                        */
/*                                                                          */
/* Coordinates become a short place name through OpenStreetMap's public     */
/* Nominatim service. Its policy allows light use at one request per        */
/* second, so lookups are cached, queued and spaced out.                    */
/* ------------------------------------------------------------------------ */

export interface PlaceName {
  /** Short label for display, e.g. "El Poblado, Medellín". */
  label: string
  /** Town or city, used to group photos into albums. */
  city: string | null
}

const cache = new Map<string, Promise<PlaceName | null>>()
let queue: Promise<unknown> = Promise.resolve()
const spacing = () => new Promise((r) => setTimeout(r, 1100))

interface NominatimAddress {
  neighbourhood?: string
  suburb?: string
  quarter?: string
  city_district?: string
  village?: string
  town?: string
  city?: string
  municipality?: string
  county?: string
  state?: string
  country?: string
}

/** OpenStreetMap names some Colombian cities "Perímetro Urbano X"; people just say X. */
const tidy = (s: string | undefined | null) =>
  s ? s.replace(/^Per[ií]metro Urbano\s+/i, '').replace(/^Zona Urbana\s+(de\s+)?/i, '').trim() || null : null

function toPlaceName(name: string | undefined, a: NominatimAddress): PlaceName | null {
  const city = tidy(a.city ?? a.town ?? a.village ?? a.municipality ?? a.county)
  const area = a.neighbourhood ?? a.suburb ?? a.quarter ?? a.city_district ?? null
  const parts = [area && area !== city ? area : null, city ?? a.state ?? a.country ?? null].filter(Boolean) as string[]
  if (parts.length === 0 && name) parts.push(name)
  if (parts.length === 0) return null
  return { label: parts.join(', '), city }
}

export function reverseGeocode(lat: number, lng: number): Promise<PlaceName | null> {
  // ~100 m precision: photos taken at the same spot share one lookup.
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`
  const hit = cache.get(key)
  if (hit) return hit

  const job = queue.then(async () => {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse')
      url.search = new URLSearchParams({
        format: 'jsonv2',
        lat: String(lat),
        lon: String(lng),
        zoom: '16',
        'accept-language': 'es',
      }).toString()
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) return null
      const body = (await res.json()) as { name?: string; address?: NominatimAddress }
      return toPlaceName(body.name, body.address ?? {})
    } catch {
      return null
    } finally {
      await spacing()
    }
  })
  queue = job
  cache.set(key, job)
  return job
}
