import { useEffect, useRef } from 'react'
import { LngLatBounds, Map as MapLibre, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl'
// MapLibre builds its worker URL at runtime, so Vite never emits it unless it's imported here.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import Supercluster from 'supercluster'
import type { Located } from '../../types'
import { formatShort } from '../../lib/format'
import { thumbnail } from '../../lib/thumbnail'

setWorkerUrl(workerUrl)

const MAX_ZOOM = 18

type Props = { id: string; imageId: string; label: string; t: number }
// rep: the newest photo of a cluster, shown as its thumbnail.
type ClusterProps = { rep: string; repImage: string; t: number }

interface PhotoMapProps {
  /** Only photos with coordinates. */
  photos: Located[]
  /** One photo, or a group that can't be split by zooming (ids is that group). */
  onOpen: (id: string, ids?: string[]) => void
}

/**
 * Places map in the style of iPhone Photos: square thumbnails where photos were
 * taken, merged into one thumbnail with a count where they would overlap.
 */
export function PhotoMap({ photos, onOpen }: PhotoMapProps) {
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibre | null>(null)
  const render = useRef<() => void>(() => {})
  const framed = useRef(false)
  // Kept in a ref so a new callback each render doesn't rebuild the map.
  const open = useRef(onOpen)
  useEffect(() => {
    open.current = onOpen
  })

  useEffect(() => {
    if (!el.current) return
    const map = new MapLibre({
      container: el.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      maxZoom: MAX_ZOOM,
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: { compact: true },
      locale: {
        'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl + rueda para acercar el mapa',
        'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ + rueda para acercar el mapa',
        'CooperativeGesturesHandler.MobileHelpText': 'Usa dos dedos para mover el mapa',
        'NavigationControl.ZoomIn': 'Acercar',
        'NavigationControl.ZoomOut': 'Alejar',
      },
    })
    map.touchZoomRotate.disableRotation()
    map.addControl(new NavigationControl({ showCompass: false }), 'top-left')
    map.on('moveend', () => render.current())
    mapRef.current = map
    return () => {
      mapRef.current = null
      framed.current = false
      map.remove() // also removes every marker
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const index = new Supercluster<Props, ClusterProps>({
      radius: 80, // clusters are measured centre to centre, so a bit more than one 56px thumbnail
      maxZoom: MAX_ZOOM,
      map: (p) => ({ rep: p.id, repImage: p.imageId, t: p.t }),
      reduce: (a, b) => {
        if (b.t > a.t) {
          a.rep = b.rep
          a.repImage = b.repImage
          a.t = b.t
        }
      },
    })
    index.load(
      photos.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          imageId: p.imageId,
          label: p.caption || p.location || formatShort(p.date),
          t: p.date?.toMillis() ?? 0,
        },
      })),
    )

    // Cluster ids change on every load, so this map starts empty each time.
    const markers = new Map<string, Marker>()

    const marker = (lngLat: [number, number], imageId: string, label: string, onClick: () => void) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.ariaLabel = label
      button.className =
        'relative block size-14 cursor-pointer rounded-[10px] border-[3px] border-white bg-well bg-cover bg-center shadow-[0_2px_6px_rgba(0,0,0,.3)]'
      button.addEventListener('click', (e) => {
        e.stopPropagation()
        onClick()
      })
      void thumbnail(imageId).then((url) => {
        if (url) button.style.backgroundImage = `url(${url})`
      })
      return new Marker({ element: button, anchor: 'bottom' }).setLngLat(lngLat)
    }

    const badge = (m: Marker, count: number) => {
      const span = document.createElement('span')
      span.className =
        'absolute -top-2 -right-2 min-w-5 rounded-full bg-accent px-1.5 text-center text-[12px] leading-5 font-bold text-white ring-2 ring-white'
      span.textContent = String(count)
      m.getElement().append(span)
      return m
    }

    render.current = () => {
      const b = map.getBounds()
      // easeTo can land a hair under the target zoom (11.9999), which would keep the cluster closed.
      const zoom = Math.floor(map.getZoom() + 1e-6)
      const seen = new Set<string>()
      for (const f of index.getClusters([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom)) {
        const lngLat = f.geometry.coordinates as [number, number]
        const p = f.properties
        const key = 'cluster' in p ? `c${p.cluster_id}` : `p${p.id}`
        seen.add(key)
        if (markers.has(key)) continue

        let m: Marker
        if ('cluster' in p) {
          m = badge(
            marker(lngLat, p.repImage, `${p.point_count} fotos`, () => {
              const next = index.getClusterExpansionZoom(p.cluster_id)
              if (next <= MAX_ZOOM) {
                map.easeTo({ center: lngLat, zoom: next })
                return
              }
              // Same spot even at full zoom: show the group in the viewer instead.
              const ids = new Set(index.getLeaves(p.cluster_id, Infinity).map((l) => (l.properties as Props).id))
              const group = photos.filter((ph) => ids.has(ph.id)).map((ph) => ph.id)
              open.current(group[0], group)
            }),
            p.point_count,
          )
        } else {
          m = marker(lngLat, p.imageId, `Abrir foto: ${p.label}`, () => open.current(p.id))
        }
        markers.set(key, m.addTo(map))
      }
      for (const [key, m] of markers) {
        if (!seen.has(key)) {
          m.remove()
          markers.delete(key)
        }
      }
    }

    if (!framed.current && photos.length > 0) {
      framed.current = true
      const bounds = new LngLatBounds()
      for (const p of photos) bounds.extend([p.lng, p.lat])
      map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 0 })
    }
    render.current()

    return () => {
      for (const m of markers.values()) m.remove()
    }
  }, [photos])

  return <div ref={el} className="h-80 w-full overflow-hidden rounded-sm bg-well sm:h-[28rem]" />
}
