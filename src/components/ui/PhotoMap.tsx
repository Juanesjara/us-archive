import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Photo } from '../../types'

export type Located = Photo & { lat: number; lng: number }

interface PhotoMapProps {
  /** Only photos with coordinates; one dot each. */
  photos: Located[]
  onOpen: (id: string) => void
}

/** Zoomable map with a dot where each photo was taken. Clicking a dot opens it. */
export function PhotoMap({ photos, onOpen }: PhotoMapProps) {
  const el = useRef<HTMLDivElement>(null)
  // Kept in a ref so a new callback each render doesn't rebuild the map.
  const open = useRef(onOpen)
  useEffect(() => {
    open.current = onOpen
  })

  useEffect(() => {
    if (!el.current || photos.length === 0) return
    const map = L.map(el.current, { scrollWheelZoom: false })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map)

    const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()
    for (const p of photos) {
      const dot = L.circleMarker([p.lat, p.lng], {
        radius: 7,
        color: '#fff',
        weight: 2,
        fillColor: accent,
        fillOpacity: 1,
      })
      const label = p.caption || p.location
      if (label) dot.bindTooltip(label, { direction: 'top' })
      dot.on('click', () => open.current(p.id)).addTo(map)
    }
    map.fitBounds(L.latLngBounds(photos.map((p) => [p.lat, p.lng])), { padding: [32, 32], maxZoom: 15 })

    return () => {
      map.remove()
    }
  }, [photos])

  // isolate keeps Leaflet's z-indexed panes under the header and the lightbox.
  return <div ref={el} className="isolate h-80 w-full rounded-sm bg-well sm:h-[28rem]" />
}
