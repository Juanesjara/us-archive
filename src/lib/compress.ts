/**
 * Re-encode an image in the browser as two JPEGs for Cloud Storage: the full
 * photo, kept close to its original resolution, and a small preview for grids
 * and the map.
 *
 * iPhone photos are often HEIC, which most browsers can't show. Drawing onto a
 * canvas and exporting JPEG fixes the format. EXIF orientation is applied when
 * decoding; the rest of EXIF is lost, so it must be read from the file first.
 */
// iOS Safari refuses canvases above ~16.7 MP; 4096 on the long edge stays under it.
const FULL = { edge: 4096, quality: 0.9 }
const THUMB = { edge: 640, quality: 0.8 }

export interface EncodedImage {
  full: Blob
  thumb: Blob
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Fall through to <img>, which Safari uses for HEIC.
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function encodeImage(file: File): Promise<EncodedImage> {
  let source: ImageBitmap | HTMLImageElement
  try {
    source = await decode(file)
  } catch {
    throw new Error(
      'Este navegador no puede leer esa imagen. Las fotos HEIC suben bien desde un iPhone; en computador, expórtalas primero como JPEG.',
    )
  }

  const srcW = 'naturalWidth' in source ? source.naturalWidth : source.width
  const srcH = 'naturalHeight' in source ? source.naturalHeight : source.height
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen en este navegador.')

  const draw = async ({ edge, quality }: { edge: number; quality: number }) => {
    const scale = Math.min(1, edge / Math.max(srcW, srcH))
    canvas.width = Math.round(srcW * scale)
    canvas.height = Math.round(srcH * scale)
    ctx.fillStyle = '#ffffff' // transparent PNGs would otherwise turn black
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) throw new Error('No se pudo procesar la imagen en este navegador.')
    return blob
  }

  try {
    const full = await draw(FULL)
    const thumb = await draw(THUMB)
    return { full, thumb }
  } finally {
    canvas.width = 0
    if ('close' in source) source.close()
  }
}
