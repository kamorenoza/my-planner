import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  onAuth,
  loginWithGoogle,
  logout as doLogout,
} from '../database/auth'
import {
  reconcilePlanner,
  startAutoBackup,
  pullRecipes,
  pullPlannerSnapshot,
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
  // Holds the active backup handle so pending writes can be flushed before
  // leaving the app or before a manual reload sync.
  const backupRef = useRef(null)

  useEffect(() => {
    const bump = () => setDataVersion((v) => v + 1)

    const syncFromCloud = async (uid) => {
      try {
        if (backupRef.current?.flush) {
          await backupRef.current.flush()
        }

        const migrated = await migrateRecipesToSubcollection(uid)
        await stripLegacyRecipesFromBigDoc(uid)

        const pulled = await reconcilePlanner(uid)
        const snapshotPulled = await pullPlannerSnapshot(uid)
        const recipesChanged = await pullRecipes(uid)

        if (pulled || snapshotPulled || recipesChanged || migrated) bump()
      } catch {
        // Offline: seguimos con datos locales; los listeners ya están adjuntos y
        // sincronizarán cuando vuelva la conexión.
      }
    }

    const attach = (uid) => {
      // El auto-backup queda activo para subir cambios locales al hacer save.
      const stopBackup = startAutoBackup(uid)
      backupRef.current = stopBackup
      return stopBackup
    }

    const unsub = onAuth(async (fbUser) => {

      if (!fbUser) {
        if (backupRef.current?.flush) {
          await backupRef.current.flush()
        }
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

      // Restored session for the same account: wait for the cloud snapshot so
      // Firebase remains the single source of truth, then render the app.
      localStorage.setItem(PLANNER_OWNER_KEY, fbUser.uid)
      setSyncing(true)
      ;(async () => {
        attach(fbUser.uid)
        await syncFromCloud(fbUser.uid)
        setUser(fbUser)
        setSyncing(false)
        setLoading(false)
      })()
      return
    })

    return () => {
      unsub()
      if (backupRef.current?.flush) {
        backupRef.current.flush()
      }
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