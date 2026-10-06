import { forgetImage, hasImage, loadImage } from '../components/ui/ArchiveImage'

const SIZE = 112 // 2x the 56px map marker
const cache = new Map<string, Promise<string | null>>()
// One full-size decode at a time: iOS Safari runs out of canvas memory otherwise.
let queue: Promise<unknown> = Promise.resolve()

/** A small square JPEG (object URL) cropped from the centre of an archive image. */
export function thumbnail(imageId: string): Promise<string | null> {
  let pending = cache.get(imageId)
  if (!pending) {
    pending = queue.then(() => make(imageId))
    queue = pending
    cache.set(imageId, pending)
  }
  return pending
}

async function make(imageId: string): Promise<string | null> {
  // Don't keep ~900KB strings around just for a thumbnail, unless something else already loaded it.
  const wasCached = hasImage(imageId)
  try {
    const url = await loadImage(imageId)
    if (!url) {
      cache.delete(imageId) // a failed fetch can be retried next time the marker shows
      return null
    }
    const img = new Image()
    img.src = url
    await img.decode()
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SIZE
    canvas
      .getContext('2d')
      ?.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, SIZE, SIZE)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8))
    canvas.width = 0
    return blob ? URL.createObjectURL(blob) : null
  } catch {
    cache.delete(imageId)
    return null
  } finally {
    if (!wasCached) forgetImage(imageId)
  }
}
