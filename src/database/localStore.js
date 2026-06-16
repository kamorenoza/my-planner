import { useState, useEffect } from 'react'

const pad = (n) => String(n).padStart(2, '0')

// Build a YYYY-MM-DD key from year/month(0-based)/day
export function dateKeyFromParts(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

// Build a YYYY-MM-DD key from a Date (using UTC parts)
export function dateKey(date) {
  return dateKeyFromParts(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
}

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable or full – ignore
  }
  notifySave(key)
}

// Apply a value that came FROM the cloud into localStorage WITHOUT notifying the
// save listeners. Esto evita un bucle: si notificáramos, el auto-backup volvería
// a subir lo que justo acabamos de bajar (ping-pong entre dispositivos).
// `rawValue` es el JSON ya serializado (tal cual se guarda en localStorage).
export function applyRemote(key, rawValue) {
  try {
    if (typeof rawValue === 'string') localStorage.setItem(key, rawValue)
  } catch {
    // storage unavailable or full – ignore
  }
}

// Key builders
export const eventsKey = (dk) => `events-${dk}`
export const todosKey = (dk) => `todos-${dk}`
export const mealsKey = (dk) => `meals-${dk}`
export const remindersKey = (dk) => `reminders-${dk}`
export const habitsKey = () => 'habits'
export const checksKey = (year, week) => `checks-${year}-W${week}`
export const recipesKey = () => 'recipes'
export const goalsKey = () => 'goals'

// ---------------------------------------------------------------------------
// Planner snapshot helpers (used for cloud backup)
// ---------------------------------------------------------------------------

// Prefixes for per-day / per-week keys and the fixed standalone keys that make
// up a user's complete planner.
const PLANNER_PREFIXES = ['events-', 'todos-', 'meals-', 'reminders-', 'checks-']

// `recipes` ya NO se guarda en el documento grande del planner: ahora cada
// receta vive en su propia subcolección de Firestore (un doc por receta). El
// motivo es el límite de 1 MiB por documento: las fotos en base64 hacían que el
// documento grande lo superara y la subida fallara en silencio. Aun así
// `recipes` sigue siendo "dato del planner" para notificar guardados y para
// limpiarlo al cambiar de usuario.
const RECIPES_KEY = 'recipes'
const BIG_DOC_KEYS = ['habits', 'goals']

// Claves que SÍ van en el documento grande (todo el planner menos recetas).
function isBigDocKey(key) {
  if (BIG_DOC_KEYS.includes(key)) return true
  return PLANNER_PREFIXES.some((prefix) => key.startsWith(prefix))
}

// Cualquier dato del planner (incluye recetas) para notificación/limpieza.
function isPlannerKey(key) {
  return key === RECIPES_KEY || isBigDocKey(key)
}

// Read every big-doc planner entry from localStorage as a { key: rawJsonString }
// map. Excluye recetas a propósito (se sincronizan aparte).
export function getAllPlannerData() {
  const data = {}
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key && isBigDocKey(key)) {
      data[key] = localStorage.getItem(key)
    }
  }
  return data
}

// Overwrite localStorage big-doc entries with a snapshot map. Existing big-doc
// keys not present in the snapshot are removed so the device mirrors the cloud.
// NUNCA toca `recipes` (eso lo maneja la sincronización de la subcolección).
export function setAllPlannerData(data) {
  if (!data || typeof data !== 'object') return

  // Remove current big-doc keys that are not in the incoming snapshot.
  const incoming = new Set(Object.keys(data))
  const toRemove = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key && isBigDocKey(key) && !incoming.has(key)) {
      toRemove.push(key)
    }
  }
  toRemove.forEach((key) => localStorage.removeItem(key))

  // Write the snapshot values.
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'string') {
      localStorage.setItem(key, value)
    }
  })
}

// Remove every planner entry from localStorage (used when switching users so
// one account never sees or uploads another account's planner).
export function clearPlannerData() {
  const toRemove = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key && isPlannerKey(key)) {
      toRemove.push(key)
    }
  }
  toRemove.forEach((key) => localStorage.removeItem(key))
}

// ---------------------------------------------------------------------------
// Save subscription – lets the backup layer react to local changes.
// ---------------------------------------------------------------------------

const saveListeners = new Set()

function notifySave(key) {
  if (!isPlannerKey(key)) return
  saveListeners.forEach((listener) => {
    try {
      listener(key)
    } catch {
      // ignore listener errors
    }
  })
}

export function subscribeToSaves(listener) {
  saveListeners.add(listener)
  return () => saveListeners.delete(listener)
}

// State that mirrors a localStorage entry
export function usePersistedState(key, initial) {
  const [state, setState] = useState(() => load(key, initial))
  const [prevKey, setPrevKey] = useState(key)

  // When the key changes (e.g. navigating to another day), reload the value
  // for the new key during render so we never persist stale data under it.
  if (key !== prevKey) {
    setPrevKey(key)
    setState(load(key, initial))
  }

  useEffect(() => {
    save(key, state)
  }, [key, state])

  return [state, setState]
}