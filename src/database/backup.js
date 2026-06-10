import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  getAllPlannerData,
  setAllPlannerData,
  subscribeToSaves,
} from "./localStore";

const userDoc = (uid) => doc(db, "users", uid);

// Write the active session id so other devices know they were superseded.
export async function registerSession(uid, sessionId) {
  await setDoc(
    userDoc(uid),
    { activeSession: sessionId, sessionUpdatedAt: serverTimestamp() },
    { merge: true },
  );
}

// Listen for session changes. When another device registers a new session id,
// onEvicted() is called so this device can sign out.
export function watchSession(uid, sessionId, onEvicted) {
  return onSnapshot(userDoc(uid), (snap) => {
    const data = snap.data();
    if (data && data.activeSession && data.activeSession !== sessionId) {
      onEvicted();
    }
  });
}

// Download the cloud planner snapshot into localStorage.
// Returns { applied, changed }:
//   applied = a non-empty cloud snapshot existed and was written locally
//   changed = the cloud snapshot differed from what was already in localStorage
export async function pullBackup(uid) {
  const snap = await getDoc(userDoc(uid));
  const data = snap.data();
  if (data && data.planner && Object.keys(data.planner).length > 0) {
    const before = getAllPlannerData();
    setAllPlannerData(data.planner);
    return { applied: true, changed: !plannerEquals(before, data.planner) };
  }
  return { applied: false, changed: false };
}

// Shallow-compare two planner snapshots ({ key: rawJsonString }).
function plannerEquals(a, b) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

// Upload the current localStorage planner snapshot to the cloud.
export async function pushBackup(uid) {
  const planner = getAllPlannerData();
  await setDoc(
    userDoc(uid),
    { planner, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

// Auto-backup: push to the cloud (debounced) whenever planner data changes.
export function startAutoBackup(uid, { delay = 1500 } = {}) {
  let timer = null;
  const unsubscribe = subscribeToSaves(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      pushBackup(uid).catch(() => {
        // network/permission error – will retry on next change
      });
    }, delay);
  });

  return () => {
    if (timer) clearTimeout(timer);
    unsubscribe();
  };
}
