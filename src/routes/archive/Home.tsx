import { Link } from 'react-router'
import { useCollection, useDocument } from '../../hooks/useCollection'
import { OFFICIAL_PATH } from '../../services/archive'
import type { Memory, OfficialState, Photo, Place, Thing } from '../../types'
import { Wordmark } from '../../components/ui/Wordmark'
import { FinalSection } from '../../components/layout/FinalSection'
import { formatFull } from '../../lib/format'
import { ArchiveImage } from '../../components/ui/ArchiveImage'

function Stat({ label, value, to, loading }: { label: string; value: number; to: string; loading: boolean }) {
  return (
    <Link to={to} className="group flex flex-col gap-1 border-t border-rule pt-4">
      <span className="text-meta text-muted transition-colors group-hover:text-ink">{label}</span>
      <span className={`serif text-title text-ink ${loading ? 'opacity-0' : ''}`}>{value}</span>
    </Link>
  )
}

function OfficialMemory({ official }: { official: OfficialState }) {
  return (
    <section className="mb-20 border-t border-rule pt-8">
      <p className="text-meta text-muted">Nuevo recuerdo agregado.</p>
      <p className="serif mt-2 text-lead text-ink">{formatFull(official.date)}</p>
      {official.photoId ? (
        <ArchiveImage
          id={official.photoId}
          alt={official.caption || ''}
          className="mt-8 max-h-[70vh] w-auto max-w-full rounded-sm"
        />
      ) : null}
      <p className="serif mt-4 text-prose text-body">{official.caption || 'Primer recuerdo oficial.'}</p>
    </section>
  )
}

export function Home() {
  const photos = useCollection<Photo>('photos')
  const memories = useCollection<Memory>('memories')
  const places = useCollection<Place>('places')
  const things = useCollection<Thing>('things', 'createdAt')
  const { data: official } = useDocument<OfficialState>(OFFICIAL_PATH)

  const stats = [
    { label: 'Fotos', value: photos.items.length, to: '/archive/photos', loading: photos.loading },
    { label: 'Recuerdos', value: memories.items.length, to: '/archive/memories', loading: memories.loading },
    { label: 'Lugares', value: places.items.length, to: '/archive/places', loading: places.loading },
    { label: 'Cosas', value: things.items.length, to: '/archive/things', loading: things.loading },
  ]

  return (
    <div className="enter">
      <Wordmark className="text-display sm:text-[6rem]" />
      <p className="mt-3 text-ui text-muted">Archivo privado</p>

      <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
        {stats.map((s) => (
          <Stat key={s.label} {...s} />
        ))}
      </div>

      <div className="mt-24">{official?.active ? <OfficialMemory official={official} /> : null}</div>

      <FinalSection />
    </div>
  )
}
