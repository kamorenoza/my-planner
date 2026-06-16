import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  getDocs,
  writeBatch,
  updateDoc,
  deleteField,
} from 'firebase/firestore'
import { db } from './firebase'
import {
  getAllPlannerData,
  subscribeToSaves,
  applyRemote,
  load,
  save,
  recipesKey,
} from './localStore'
import { compressOversizedRecipePhotos } from './migrate'

const userDoc = (uid) => doc(db, 'users', uid)

// ---------------------------------------------------------------------------
// Sincronización del documento grande (todo el planner menos recetas)
// ---------------------------------------------------------------------------
// Modelo multi-dispositivo SIN expulsión: varios dispositivos pueden estar
// logueados a la vez. Para que las ediciones no se pisen entre sí escribimos a
// NIVEL DE CAMPO: cada clave del planner (events-FECHA, todos-FECHA, etc.) se
// sube por separado con merge, así editar el día 1 en el celular no borra la
// edición del día 2 hecha en el iPad. Un listener en tiempo real (onSnapshot)
// baja los cambios del otro dispositivo. Costo: 1 lectura por cambio y por
// dispositivo conectado — muy por debajo del nivel gratuito.

// Lee el mapa `planner` del documento grande (una sola lectura).
async function getCloudPlanner(uid) {
  const snap = await getDoc(userDoc(uid))
  const data = snap.data()
  return (data && data.planner) || {}
}

// Sube SOLO las claves indicadas (merge a nivel de campo dentro de `planner`).
async function pushKeysMap(uid, map) {
  if (!map || Object.keys(map).length === 0) return
  await setDoc(
    userDoc(uid),
    { planner: map, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

// Sube al cloud las claves locales indicadas (toma su valor actual de
// localStorage). Field-level: no toca las demás claves del documento.
export async function pushKeys(uid, keys) {
  const all = getAllPlannerData()
  const map = {}
  keys.forEach((k) => {
    if (all[k] !== undefined) map[k] = all[k]
  })
  await pushKeysMap(uid, map)
}

// Sube todo el planner local clave por clave (merge). Se usa la primera vez que
// un dispositivo siembra la nube.
export async function pushBackup(uid) {
  await pushKeysMap(uid, getAllPlannerData())
}

// Conciliación inicial al entrar (una sola lectura). Política determinista:
//  - clave solo local (nunca subida)  -> se sube
//  - clave solo en la nube            -> se baja
//  - clave en ambos y distinta        -> gana la nube (evita que un dispositivo
//                                        desactualizado pise datos más nuevos)
// A partir de ahí, los listeners en tiempo real mantienen ambos al día.
// Devuelve true si algo cambió localmente (para refrescar la UI).
export async function reconcilePlanner(uid) {
  const cloud = await getCloudPlanner(uid)
  const local = getAllPlannerData()
  const keys = new Set([...Object.keys(cloud), ...Object.keys(local)])
  const toPush = {}
  let pulled = false
  keys.forEach((k) => {
    const c = cloud[k]
    const l = local[k]
    if (c === undefined && l !== undefined) {
      toPush[k] = l
    } else if (typeof c === 'string' && c !== l) {
      applyRemote(k, c)
      pulled = true
    }
  })
  if (Object.keys(toPush).length > 0) await pushKeysMap(uid, toPush)
  return pulled
}

// Listener en tiempo real del documento grande: baja a localStorage las claves
// que cambien en la nube (gana la nube) y llama onRemoteChange() si algo cambió.
export function watchPlanner(uid, onRemoteChange) {
  return onSnapshot(userDoc(uid), (snap) => {
    const data = snap.data()
    const planner = (data && data.planner) || null
    if (!planner) return
    const local = getAllPlannerData()
    let changed = false
    Object.entries(planner).forEach(([k, v]) => {
      if (typeof v === 'string' && local[k] !== v) {
        applyRemote(k, v)
        changed = true
      }
    })
    if (changed) onRemoteChange()
  })
}

// ---------------------------------------------------------------------------
// Recetas: subcolección users/{uid}/recipes/{recipeId} (un doc por receta)
// ---------------------------------------------------------------------------
// Cada receta guarda su foto en base64 (inline). En el documento grande del
// planner harían que superara el límite de 1 MiB de Firestore (subida fallida
// en silencio -> pérdida de fotos). Con un documento por receta cada uno pesa
// poco (~200-270 KB) y caben cientos sin problema.

// Marca (por dispositivo) de que ya se migraron las recetas del documento
// grande antiguo a la subcolección.
const RECIPES_MIGRATED_KEY = 'recipes-subcol-migrated'

const recipesCol = (uid) => collection(db, 'users', uid, 'recipes')
const recipeDoc = (uid, id) => doc(db, 'users', uid, 'recipes', id)

// Compara dos listas de recetas sin importar el orden.
function stableRecipes(list) {
  if (!Array.isArray(list)) return '[]'
  return JSON.stringify(
    [...list].sort((a, b) =>
      String(a && a.id).localeCompare(String(b && b.id)),
    ),
  )
}

// Sube al cloud las recetas locales que difieran y borra las que ya no existen
// localmente. Diff-based: si nada cambió no escribe. Devuelve true si escribió.
export async function pushRecipes(uid) {
  const recipes = load(recipesKey(), [])
  if (!Array.isArray(recipes)) return false
  const snap = await getDocs(recipesCol(uid))
  const cloud = new Map(snap.docs.map((d) => [d.id, JSON.stringify(d.data())]))
  const localIds = new Set(recipes.map((r) => r && r.id).filter(Boolean))

  const batch = writeBatch(db)
  let writes = 0
  recipes.forEach((r) => {
    if (!r || !r.id) return
    if (cloud.get(r.id) !== JSON.stringify(r)) {
      batch.set(recipeDoc(uid, r.id), r)
      writes += 1
    }
  })
  cloud.forEach((_, id) => {
    if (!localIds.has(id)) {
      batch.delete(recipeDoc(uid, id))
      writes += 1
    }
  })
  if (writes > 0) await batch.commit()
  return writes > 0
}

// Baja las recetas del cloud a localStorage. Si la subcolección está vacía pero
// se pasan recetas heredadas (del documento grande antiguo) las usa y siembra
// la subcolección. Devuelve true si localStorage cambió.
export async function pullRecipes(uid, legacyRecipes = null) {
  const snap = await getDocs(recipesCol(uid))
  let recipes
  if (snap.empty && Array.isArray(legacyRecipes) && legacyRecipes.length) {
    recipes = legacyRecipes
    const batch = writeBatch(db)
    recipes.forEach((r) => {
      if (r && r.id) batch.set(recipeDoc(uid, r.id), r)
    })
    await batch.commit()
  } else {
    recipes = snap.docs.map((d) => d.data())
  }

  if (stableRecipes(load(recipesKey(), [])) !== stableRecipes(recipes)) {
    save(recipesKey(), recipes)
    return true
  }
  return false
}

// Lee las recetas heredadas que aún viven en el documento grande (formato viejo).
export async function getLegacyRecipes(uid) {
  const snap = await getDoc(userDoc(uid))
  const raw = snap.data() && snap.data().planner && snap.data().planner.recipes
  if (typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

// Elimina el campo heredado planner.recipes del documento grande.
export async function stripLegacyRecipesFromBigDoc(uid) {
  try {
    await updateDoc(userDoc(uid), { 'planner.recipes': deleteField() })
  } catch {
    // El documento puede no existir aún: nada que limpiar.
  }
}

export function markRecipesMigrated() {
  try {
    localStorage.setItem(RECIPES_MIGRATED_KEY, '1')
  } catch {
    // almacenamiento no disponible – se reintentará en el próximo arranque
  }
}

// Migración única (por dispositivo): mueve las recetas del documento grande
// antiguo a la subcolección. Reescala fotos viejas grandes, fusiona con lo que
// ya haya en la nube (la nube gana en conflicto, para no pisar una foto que
// otro dispositivo ya subió) y conserva las recetas que solo existen local.
export async function migrateRecipesToSubcollection(uid) {
  try {
    if (localStorage.getItem(RECIPES_MIGRATED_KEY)) return false
  } catch {
    return false
  }

  // Reescala fotos viejas (>300 KB) para que cada doc quede pequeño.
  await compressOversizedRecipePhotos()

  const local = load(recipesKey(), [])
  const localArr = Array.isArray(local) ? local : []
  const snap = await getDocs(recipesCol(uid))
  const cloud = new Map(snap.docs.map((d) => [d.id, d.data()]))

  // Fusión: la nube gana en conflicto; se añaden las recetas solo locales.
  const merged = []
  cloud.forEach((data) => merged.push(data))
  localArr.forEach((r) => {
    if (r && r.id && !cloud.has(r.id)) merged.push(r)
  })

  // Sube a la nube las recetas que solo existen localmente.
  const batch = writeBatch(db)
  let writes = 0
  localArr.forEach((r) => {
    if (r && r.id && !cloud.has(r.id)) {
      batch.set(recipeDoc(uid, r.id), r)
      writes += 1
    }
  })
  if (writes > 0) await batch.commit()

  save(recipesKey(), merged)
  markRecipesMigrated()
  return true
}

// Listener en tiempo real de la subcolección de recetas: baja a localStorage
// los cambios hechos en otro dispositivo (sin volver a subirlos) y llama
// onRemoteChange() si la lista local cambió.
export function watchRecipes(uid, onRemoteChange) {
  return onSnapshot(recipesCol(uid), (snap) => {
    const recipes = snap.docs.map((d) => d.data())
    if (stableRecipes(load(recipesKey(), [])) !== stableRecipes(recipes)) {
      // applyRemote = escribe sin notificar (evita el bucle push/pull).
      applyRemote(recipesKey(), JSON.stringify(recipes))
      onRemoteChange()
    }
  })
}

// Auto-backup: push to the cloud (debounced) whenever planner data changes.
//
// CRÍTICO (iOS PWA): el debounce con setTimeout NO se dispara si el sistema
// congela/suspende la página al cambiar de app o cerrarla. Eso hacía que la
// última edición nunca llegara a la nube y, al reabrir, el pull sobrescribía
// localStorage con la versión vieja: pérdida de datos. Por eso forzamos un
// "flush" inmediato cuando la app se oculta (visibilitychange → hidden),
// en pagehide, y al desmontar (cierre de sesión / expulsión de sesión).
export function startAutoBackup(uid, { delay = 1500 } = {}) {
  let timer = null
  const pendingKeys = new Set() // claves del doc grande pendientes de subir
  let pendingRecipes = false
  let inFlight = null

  const flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (pendingKeys.size === 0 && !pendingRecipes) {
      return inFlight || Promise.resolve()
    }
    const keys = [...pendingKeys]
    const doRecipes = pendingRecipes
    pendingKeys.clear()
    pendingRecipes = false
    const tasks = []
    if (keys.length) tasks.push(pushKeys(uid, keys))
    if (doRecipes) tasks.push(pushRecipes(uid))
    inFlight = Promise.all(tasks)
      .catch(() => {
        // Falló (red/permiso): marca de nuevo como pendiente para reintentar
        // en el próximo cambio o flush.
        keys.forEach((k) => pendingKeys.add(k))
        if (doRecipes) pendingRecipes = true
      })
      .finally(() => {
        inFlight = null
      })
    return inFlight
  }

  const schedule = (key) => {
    // Las recetas se sincronizan en su subcolección; el resto va al doc grande
    // clave por clave (field-level) para no pisar ediciones de otro dispositivo.
    if (key === recipesKey()) pendingRecipes = true
    else pendingKeys.add(key)
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, delay)
  }

  const unsubscribe = subscribeToSaves(schedule)

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') flush()
  }
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', flush)

  const stop = () => {
    flush() // sube cualquier cambio pendiente antes de soltar los listeners
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', flush)
    unsubscribe()
  }
  // Exponemos flush para poder forzar la subida antes de un pull.
  stop.flush = flush
  stop.hasPending = () => pendingKeys.size > 0 || pendingRecipes
  return stop
}
