import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  writeBatch,
  deleteDoc,
  updateDoc,
  deleteField,
} from 'firebase/firestore'
import { db } from './firebase'
import {
  getAllPlannerData,
  subscribeToSaves,
  load,
  save,
  recipesKey,
  setAllPlannerData,
} from './localStore'

const userDoc = (uid) => doc(db, 'users', uid)

// ---------------------------------------------------------------------------
// Sincronización del documento grande (todo el planner menos recetas)
// ---------------------------------------------------------------------------
// Modelo multi-dispositivo SIN expulsión: varios dispositivos pueden estar
// logueados a la vez. Para que las ediciones no se pisen entre sí escribimos a
// NIVEL DE CAMPO: cada clave del planner (events-FECHA, todos-FECHA, etc.) se
// sube por separado con merge, así editar el día 1 en el celular no borra la
// edición del día 2 hecha en el iPad. Los cambios del otro dispositivo se
// descargan únicamente al recargar.

// Lee el mapa `planner` del documento grande (una sola lectura).
async function getCloudPlanner(uid) {
  const snap = await getDoc(userDoc(uid))
  const data = snap.data()
  const planner = (data && data.planner) || {}
  return planner
}

function parsePlannerSnapshot(raw) {
  if (typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
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

// Conciliación inicial al entrar (una sola lectura). Política determinista:
//  - clave solo local (nunca subida)  -> se sube
//  - clave solo en la nube            -> se baja
//  - clave en ambos y distinta        -> gana la nube (evita que un dispositivo
//                                        desactualizado pise datos más nuevos)
// En este modo manual, el pull solo se hace al recargar la app.
export async function reconcilePlanner(uid) {
  const cloud = await getCloudPlanner(uid)
  setAllPlannerData(cloud)
  return true
}

// ---------------------------------------------------------------------------
// Recetas: subcolección users/{uid}/recipes/{recipeId} (un doc por receta)
// ---------------------------------------------------------------------------
// Cada receta guarda su foto en base64 (inline). En el documento grande del
// planner harían que superara el límite de 1 MiB de Firestore (subida fallida
// en silencio -> pérdida de fotos). Con un documento por receta cada uno pesa
// poco (~200-270 KB) y caben cientos sin problema.

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

export async function saveRecipeToCloud(uid, recipe) {
  if (!uid || !recipe?.id) return
  await setDoc(recipeDoc(uid, recipe.id), recipe)
}

export async function deleteRecipeFromCloud(uid, recipeId) {
  await deleteDoc(recipeDoc(uid, recipeId))
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
  const data = snap.data() || {}
  const legacyRaw = data.planner && data.planner.recipes
  const snapshot = parsePlannerSnapshot(data.plannerSnapshot)
  const snapshotRaw = snapshot && snapshot.recipes
  const raw = typeof legacyRaw === 'string' ? legacyRaw : snapshotRaw

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {
      // Try the other legacy source if this value is malformed.
    }
  }

  return null
}

// Elimina el campo heredado planner.recipes del documento grande.
export async function stripLegacyRecipesFromBigDoc(uid) {
  try {
    await updateDoc(userDoc(uid), { 'planner.recipes': deleteField() })
  } catch {
    // El documento puede no existir aún: nada que limpiar.
  }
}

// Auto-backup: sube al cloud (con debounce) los cambios explícitos de la sesión.
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
  const inFlightKeys = new Set() // claves en pleno push (aún no confirmadas)
  let inFlight = null

  const flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (pendingKeys.size === 0) {
      return inFlight || Promise.resolve()
    }
    const keys = [...pendingKeys]
    pendingKeys.clear()
    // Se mantienen pendientes hasta confirmar la subida, para evitar perder
    // cambios locales mientras una escritura está en vuelo.
    keys.forEach((k) => inFlightKeys.add(k))
    const tasks = []
    if (keys.length) tasks.push(pushKeys(uid, keys))
    inFlight = Promise.all(tasks)
      .catch(() => {
        // Falló (red/permiso): marca de nuevo como pendiente para reintentar
        // en el próximo cambio o flush.
        keys.forEach((k) => pendingKeys.add(k))
      })
      .finally(() => {
        keys.forEach((k) => inFlightKeys.delete(k))
        inFlight = null
      })
    return inFlight
  }

  const schedule = (key) => {
    // Las recetas se sincronizan en su subcolección; el resto va al doc grande
    // clave por clave (field-level) para no pisar ediciones de otro dispositivo.
    if (key === recipesKey()) return
    pendingKeys.add(key)
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, delay)
  }

  const unsubscribe = subscribeToSaves(schedule)
  const flushOnHide = () => {
    flush()
  }
  const flushOnPageHide = () => {
    flush()
  }
  document.addEventListener('visibilitychange', flushOnHide)
  window.addEventListener('pagehide', flushOnPageHide)

  const stop = () => {
    flush() // sube cualquier cambio pendiente antes de soltar los listeners
    document.removeEventListener('visibilitychange', flushOnHide)
    window.removeEventListener('pagehide', flushOnPageHide)
    unsubscribe()
  }
  // Exponemos flush para poder forzar la subida antes de un pull.
  stop.flush = flush
  stop.hasPending = () =>
    pendingKeys.size > 0 ||
    inFlightKeys.size > 0
  // ¿Hay una edición local sin subir para esta clave? (pendiente o en vuelo)
  stop.isPending = (key) => pendingKeys.has(key) || inFlightKeys.has(key)
  return stop
}