import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  onAuth,
  loginWithGoogle,
  logout as doLogout,
  createSessionId,
} from '../database/auth'
import {
  registerSession,
  watchSession,
  pullBackup,
  pushBackup,
  startAutoBackup,
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
    // Start watching for session eviction and auto-backing up local changes.
    const attach = (uid, sessionId) => {
      const stopWatch = watchSession(uid, sessionId, () => {
        doLogout()
      })
      const stopBackup = startAutoBackup(uid)
      backupRef.current = stopBackup
      cleanupRef.current = () => {
        stopWatch()
        stopBackup()
        backupRef.current = null
      }
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

      const sessionId = createSessionId()
      const freshLogin = sessionStorage.getItem(FRESH_LOGIN_KEY) === '1'
      sessionStorage.removeItem(FRESH_LOGIN_KEY)
      const prevOwner = localStorage.getItem(PLANNER_OWNER_KEY)
      const foreign = Boolean(prevOwner && prevOwner !== fbUser.uid)

      if (freshLogin || foreign) {
        // Brand new login, or a different account on this device: show the sync
        // screen and pull the cloud planner before rendering.
        setSyncing(true)
        try {
          if (foreign) clearPlannerData()
          await registerSession(fbUser.uid, sessionId)
          const { applied } = await pullBackup(fbUser.uid)
          // Recetas: bajar de la subcolección. Si está vacía pero el documento
          // grande aún tiene recetas heredadas, se siembran desde ahí.
          const legacy = await getLegacyRecipes(fbUser.uid)
          await pullRecipes(fbUser.uid, legacy)
          await stripLegacyRecipesFromBigDoc(fbUser.uid)
          markRecipesMigrated()
          if (!applied) await pushBackup(fbUser.uid)
          localStorage.setItem(PLANNER_OWNER_KEY, fbUser.uid)
        } catch {
          // Network/permission issue – continue with local data.
        }
        attach(fbUser.uid, sessionId)
        setUser(fbUser)
        setSyncing(false)
        setLoading(false)
        return
      }

      // Restored session for the same account: trust localStorage and render
      // immediately so startup is instant. Claim the session, watch for
      // eviction and refresh from the cloud in the background.
      localStorage.setItem(PLANNER_OWNER_KEY, fbUser.uid)
      setUser(fbUser)
      setLoading(false)
      setSyncing(false)
      ;(async () => {
        let registered = false
        try {
          // Claim this device first (this is what evicts other devices), then
          // start watching so we don't evict ourselves with our own id.
          await registerSession(fbUser.uid, sessionId)
          registered = true
          attach(fbUser.uid, sessionId)

          // Recetas: migración única del documento grande viejo a la
          // subcolección (reescala fotos grandes, fusiona y siembra la nube).
          const migrated = await migrateRecipesToSubcollection(fbUser.uid)
          await stripLegacyRecipesFromBigDoc(fbUser.uid)

          // Flush any local edits made during startup BEFORE pulling, so the
          // cloud snapshot never overwrites unpushed local changes.
          if (backupRef.current?.hasPending?.()) {
            await backupRef.current.flush()
          }
          const { applied, changed } = await pullBackup(fbUser.uid)
          // Trae recetas de otros dispositivos (la subcolección es la fuente).
          const recipesChanged = await pullRecipes(fbUser.uid)
          if (changed || recipesChanged || migrated) setDataVersion((v) => v + 1)
          else if (!applied) await pushBackup(fbUser.uid)
        } catch {
          // Offline: keep using local data; still watch for eviction.
          if (!registered) attach(fbUser.uid, sessionId)
        }
      })()
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