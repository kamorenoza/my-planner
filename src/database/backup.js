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
  setAllPlannerData,
  subscribeToSaves,
  load,
  save,
  recipesKey,
} from './localStore'
import { compressOversizedRecipePhotos } from './migrate'

const userDoc = (uid) => doc(db, 'users', uid)

// Write the active session id so other devices know they were superseded.
export async function registerSession(uid, sessionId) {
  await setDoc(
    userDoc(uid),
    { activeSession: sessionId, sessionUpdatedAt: serverTimestamp() },
    { merge: true },
  )
}

// Listen for session changes. When another device registers a new session id,
// onEvicted() is called so this device can sign out.
export function watchSession(uid, sessionId, onEvicted) {
  return onSnapshot(userDoc(uid), (snap) => {
    const data = snap.data()
    if (data && data.activeSession && data.activeSession !== sessionId) {
      onEvicted()
    }
  })
}

// Download the cloud planner snapshot into localStorage.
// Returns { applied, changed }:
//   applied = a non-empty cloud snapshot existed and was written locally
//   changed = the cloud snapshot differed from what was already in localStorage
export async function pullBackup(uid) {
  const snap = await getDoc(userDoc(uid))
  const data = snap.data()
  if (data && data.planner && Object.keys(data.planner).length > 0) {
    const before = getAllPlannerData()
    setAllPlannerData(data.planner)
    return { applied: true, changed: !plannerEquals(before, data.planner) }
  }
  return { applied: false, changed: false }
}

// Shallow-compare two planner snapshots ({ key: rawJsonString }).
function plannerEquals(a, b) {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false
  }
  return true
}

// Upload the current localStorage planner snapshot to the cloud.
export async function pushBackup(uid) {
  const planner = getAllPlannerData()
  await setDoc(
    userDoc(uid),
    { planner, updatedAt: serverTimestamp() },
    { merge: true },
  )
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
  let pendingBig = false
  let pendingRecipes = false
  let inFlight = null

  const flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!pendingBig && !pendingRecipes) return inFlight || Promise.resolve()
    const doBig = pendingBig
    const doRecipes = pendingRecipes
    pendingBig = false
    pendingRecipes = false
    const tasks = []
    if (doBig) tasks.push(pushBackup(uid))
    if (doRecipes) tasks.push(pushRecipes(uid))
    inFlight = Promise.all(tasks)
      .catch(() => {
        // Falló (red/permiso): marca de nuevo como pendiente para reintentar
        // en el próximo cambio o flush.
        if (doBig) pendingBig = true
        if (doRecipes) pendingRecipes = true
      })
      .finally(() => {
        inFlight = null
      })
    return inFlight
  }

  const schedule = (key) => {
    // Las recetas se sincronizan en su subcolección; el resto en el doc grande.
    if (key === recipesKey()) pendingRecipes = true
    else pendingBig = true
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
  stop.hasPending = () => pendingBig || pendingRecipes
  return stop
}