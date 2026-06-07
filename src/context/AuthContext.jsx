import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  onAuth,
  loginWithGoogle,
  logout as doLogout,
  createSessionId,
} from "../database/auth";
import {
  registerSession,
  watchSession,
  pullBackup,
  pushBackup,
  startAutoBackup,
} from "../database/backup";
import { clearPlannerData } from "../database/localStore";

const AuthContext = createContext(null);

// Remembers which user the planner data currently in localStorage belongs to,
// so we never mix or upload one account's planner under another account.
const PLANNER_OWNER_KEY = "planner-owner";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  // Holds the teardown for the active session's listeners (watch + backup).
  const cleanupRef = useRef(null);

  useEffect(() => {
    const unsub = onAuth(async (fbUser) => {
      // Tear down listeners from any previous session.
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      if (!fbUser) {
        setUser(null);
        setLoading(false);
        setSyncing(false);
        return;
      }

      setSyncing(true);
      const sessionId = createSessionId();

      try {
        // If the local planner belongs to a different user (or is unknown
        // from a previous account), drop it so this account never sees or
        // uploads someone else's data.
        const prevOwner = localStorage.getItem(PLANNER_OWNER_KEY);
        if (prevOwner && prevOwner !== fbUser.uid) {
          clearPlannerData();
        }

        // Claim this device as the only active session.
        await registerSession(fbUser.uid, sessionId);
        // Download the cloud planner into localStorage for a fluid local UX.
        const applied = await pullBackup(fbUser.uid);
        // No cloud backup yet: seed it with whatever local data is left (only
        // this user's, since foreign data was cleared above).
        if (!applied) await pushBackup(fbUser.uid);
        // Mark this device's planner as owned by the current user.
        localStorage.setItem(PLANNER_OWNER_KEY, fbUser.uid);
      } catch {
        // Network/permission issue – continue with local data.
      }

      // Force-logout if another device claims the session afterwards.
      const stopWatch = watchSession(fbUser.uid, sessionId, () => {
        doLogout();
      });
      // Auto-backup to the cloud on every local change.
      const stopBackup = startAutoBackup(fbUser.uid);
      cleanupRef.current = () => {
        stopWatch();
        stopBackup();
      };

      setUser(fbUser);
      setSyncing(false);
      setLoading(false);
    });

    return () => {
      unsub();
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  const value = {
    user,
    loading,
    syncing,
    login: loginWithGoogle,
    logout: doLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
