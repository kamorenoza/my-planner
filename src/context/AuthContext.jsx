import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  onAuth,
  loginWithGoogle,
  logout as doLogout,
} from '../database/auth'
import {
  reconcilePlanner,
  startAutoBackup,
  watchPlanner,
  watchRecipes,
  pullRecipes,
  getLegacyRecipes,
  stripLegacyRecipesFromBigDoc,
  migrateRecipesToSubcollection,
  markRecipesMigrated,
} from '../database/backup'
import { clearPlannerData } from '../database/localStore'

const AuthContext = createContext(null)

// Remembers which user the planner data currently in localStorage belongs to,
// so we never mix or upload one account's planner under another account.
const PLANNER_OWNER_KEY = 'planner-owner'

// Set right before a real "Sign in with Google" attempt so we can tell a brand
// new login (show the sync screen, pull cloud first) apart from a session that
// Firebase simply restored from local persistence (render instantly).
const FRESH_LOGIN_KEY = 'fresh-login'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  // Bumped only when a background cloud pull brings data that differs from what
  // is already in localStorage, forcing the routed views to reload it.
  const [dataVersion, setDataVersion] = useState(0)
  // Holds the teardown for the active session's listeners (watch + backup).
  const cleanupRef = useRef(null)
  // Holds the active auto-backup handle so we can flush pending writes before a
  // background pull (avoids the pull clobbering just-made local edits).
  const backupRef = useRef(null)

  useEffect(() => {
    const bump = () => setDataVersion((v) => v + 1)

    // Multi-dispositivo SIN expulsión: en lugar de vigilar una "sesión activa"
    // y desloguear a los demás, escuchamos en tiempo real los cambios en la
    // nube (planner + recetas) y subimos los cambios locales. Varios
    // dispositivos pueden estar logueados a la vez y se mantienen en sync.
    const attach = (uid) => {
      // El auto-backup se inicia PRIMERO: así queda suscrito a los guardados y
      // cualquier edición hecha nada más abrir la app se registra como pendiente
      // de subir. Su predicado isPending protege esas claves para que la
      // conciliación / el listener no las pisen con la versión vieja de la nube.
      const stopBackup = startAutoBackup(uid)
      backupRef.current = stopBackup
      const stopPlanner = watchPlanner(uid, bump, stopBackup.isPending)
      const stopRecipes = watchRecipes(uid, bump)
      cleanupRef.current = () => {
        stopPlanner()
        stopRecipes()
        stopBackup()
        backupRef.current = null
      }
      return stopBackup
    }

    const unsub = onAuth(async (fbUser) => {
      // Tear down listeners from any previous session.
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }

      if (!fbUser) {
        setUser(null)
        setLoading(false)
        setSyncing(false)
        return
      }

      const freshLogin = sessionStorage.getItem(FRESH_LOGIN_KEY) === '1'
      sessionStorage.removeItem(FRESH_LOGIN_KEY)
      const prevOwner = localStorage.getItem(PLANNER_OWNER_KEY)
      const foreign = Boolean(prevOwner && prevOwner !== fbUser.uid)

      if (freshLogin || foreign) {
        // Brand new login, or a different account on this device: show the sync
        // screen and reconcile with the cloud before rendering.
        setSyncing(true)
        try {
          if (foreign) clearPlannerData()
          await reconcilePlanner(fbUser.uid)
          // Recetas: bajar de la subcolección. Si está vacía pero el documento
          // grande aún tiene recetas heredadas, se siembran desde ahí.
          const legacy = await getLegacyRecipes(fbUser.uid)
          await pullRecipes(fbUser.uid, legacy)
          await stripLegacyRecipesFromBigDoc(fbUser.uid)
          markRecipesMigrated()
          localStorage.setItem(PLANNER_OWNER_KEY, fbUser.uid)
        } catch {
          // Network/permission issue – continue with local data.
        }
        attach(fbUser.uid)
        setUser(fbUser)
        setSyncing(false)
        setLoading(false)
        return
      }

      // Restored session for the same account: trust localStorage and render
      // immediately so startup is instant. Then reconcile with the cloud and
      // attach the real-time listeners in the background.
      localStorage.setItem(PLANNER_OWNER_KEY, fbUser.uid)
      setUser(fbUser)
      setLoading(false)
      setSyncing(false)
      ;(async () => {
        // Adjuntamos PRIMERO (auto-backup + listeners). Así, si el usuario toca
        // algo apenas abre la app, ese cambio queda pendiente de subir y la
        // conciliación de abajo NO lo pisa con la versión vieja de la nube.
        const stopBackup = attach(fbUser.uid)
        try {
          // Recetas: migración única del documento grande viejo a la
          // subcolección (reescala fotos grandes, fusiona y siembra la nube).
          const migrated = await migrateRecipesToSubcollection(fbUser.uid)
          await stripLegacyRecipesFromBigDoc(fbUser.uid)

          // Conciliación inicial a nivel de campo: sube lo solo-local, baja lo
          // de la nube y respeta las ediciones locales sin subir (gana local).
          const pulled = await reconcilePlanner(fbUser.uid, stopBackup.isPending)
          const recipesChanged = await pullRecipes(fbUser.uid)

          if (pulled || recipesChanged || migrated) bump()
        } catch {
          // Offline: seguimos con datos locales; los listeners ya están
          // adjuntos y sincronizarán cuando vuelva la conexión.
        }
      })()
      return
    })

    return () => {
      unsub()
      if (cleanupRef.current) cleanupRef.current()
    }
  }, [])

  // Wrap login so we can flag it as a real sign-in (vs a restored session).
  const login = () => {
    sessionStorage.setItem(FRESH_LOGIN_KEY, '1')
    return loginWithGoogle().catch((err) => {
      sessionStorage.removeItem(FRESH_LOGIN_KEY)
      throw err
    })
  }

  // Wrap logout so we flush any pending local edits to the cloud BEFORE
  // signing out. Firebase signOut revokes auth immediately; after that,
  // Firestore writes are rejected by security rules and the last edits (e.g. a
  // just-added recipe photo still inside the debounce window) would be lost.
  const logout = async () => {
    try {
      if (backupRef.current?.flush) {
        await backupRef.current.flush()
      }
    } catch {
      // Network/permission issue – sign out anyway.
    }
    return doLogout()
  }

  const value = {
    user,
    loading,
    syncing,
    dataVersion,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}