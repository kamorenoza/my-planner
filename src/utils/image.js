// Image helpers shared by the recipe photo flow and the cloud-backup migration.
//
// CRÍTICO: todo el planner (recetas incluidas) se respalda como UN solo
// documento de Firestore, que tiene un límite duro de 1 MiB. Una foto de la
// cámara pesa varios MB; guardada en crudo (base64) hace que la subida a la
// nube falle EN SILENCIO. Luego el "pull" en segundo plano sobrescribe
// localStorage con la versión vieja (sin foto) y la foto desaparece en todos
// los dispositivos. Por eso toda foto se reescala y se comprime a un tamaño
// que cabe de sobra en el documento.

const DEFAULT_MAX_DIM = 1024
const DEFAULT_QUALITY = 0.7

// Approximate the byte size of a data URL (base64 expands bytes ~4/3).
export function approxDataUrlBytes(dataUrl) {
  if (typeof dataUrl !== 'string') return 0
  const comma = dataUrl.indexOf(',')
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  return Math.floor((b64.length * 3) / 4)
}

// Resize (longest side -> maxDim) and re-encode as JPEG. Accepts a File/Blob or
// an existing data URL string. Resolves to a compact JPEG data URL.
export function compressImageToDataURL(
  source,
  { maxDim = DEFAULT_MAX_DIM, quality = DEFAULT_QUALITY } = {},
) {
  return new Promise((resolve, reject) => {
    const drawFromSrc = (src) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        let { width, height } = img
        if (width >= height && width > maxDim) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else if (height > width && height > maxDim) {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = src
    }

    if (typeof source === 'string') {
      drawFromSrc(source)
      return
    }
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => drawFromSrc(reader.result)
    reader.readAsDataURL(source)
  })
}