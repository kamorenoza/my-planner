import { load, save, recipesKey } from './localStore'
import { approxDataUrlBytes, compressImageToDataURL } from '../utils/image'

// Cualquier foto guardada por encima de este tamaño se vuelve a comprimir. Las
// fotos viejas (agregadas antes de la compresión) pesan varios MB y hacían que
// el documento del planner superara el límite de 1 MiB de Firestore, por lo que
// la subida fallaba en silencio. Tras recomprimirlas (~150 KB) el documento
// vuelve a caber y la sincronización funciona.
const MAX_PHOTO_BYTES = 300 * 1024

// Recomprime in situ las fotos de receta demasiado grandes en localStorage.
// Devuelve true si cambió algo (para forzar una subida a la nube).
export async function compressOversizedRecipePhotos() {
  const recipes = load(recipesKey(), [])
  if (!Array.isArray(recipes) || recipes.length === 0) return false

  let changed = false
  const out = []
  for (const recipe of recipes) {
    if (
      recipe &&
      typeof recipe.photo === 'string' &&
      approxDataUrlBytes(recipe.photo) > MAX_PHOTO_BYTES
    ) {
      try {
        const photo = await compressImageToDataURL(recipe.photo)
        out.push({ ...recipe, photo })
        changed = true
        continue
      } catch {
        // Si falla la recompresión, conserva la original.
      }
    }
    out.push(recipe)
  }

  if (changed) save(recipesKey(), out)
  return changed
}