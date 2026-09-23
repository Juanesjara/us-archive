/**
 * Resize and re-encode an image in the browser so it fits inside one
 * Firestore document (1 MiB hard limit, including field names).
 *
 * iPhone photos are ~3 MB and often HEIC. Drawing onto a canvas and exporting
 * JPEG fixes both size and format. EXIF orientation is applied when decoding.
 * If the first pass is still too large, quality and then dimensions step down
 * until the base64 data URL fits.
 */
const MAX_DATA_URL_CHARS = 900_000
const STEPS: { edge: number; quality: number }[] = [
  { edge: 1600, quality: 0.82 },
  { edge: 1600, quality: 0.72 },
  { edge: 1400, quality: 0.7 },
  { edge: 1200, quality: 0.68 },
  { edge: 1000, quality: 0.65 },
]

export interface CompressedImage {
  dataUrl: string
  width: number
  height: number
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

export async function compressImage(file: File): Promise<CompressedImage> {
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

  try {
    for (const step of STEPS) {
      const scale = Math.min(1, step.edge / Math.max(srcW, srcH))
      const w = Math.round(srcW * scale)
      const h = Math.round(srcH * scale)
      canvas.width = w
      canvas.height = h
      ctx.fillStyle = '#ffffff' // transparent PNGs would otherwise turn black
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(source, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', step.quality)
      if (dataUrl.length <= MAX_DATA_URL_CHARS) return { dataUrl, width: w, height: h }
    }
  } finally {
    if ('close' in source) source.close()
  }
  throw new Error('Esa imagen es demasiado pesada para guardarla. Prueba con otra foto.')
}
