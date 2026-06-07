import { useState, useEffect } from "react";

const pad = (n) => String(n).padStart(2, "0");

// Build a YYYY-MM-DD key from year/month(0-based)/day
export function dateKeyFromParts(year, month, day) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

// Build a YYYY-MM-DD key from a Date (using UTC parts)
export function dateKey(date) {
  return dateKeyFromParts(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable or full – ignore
  }
  notifySave(key);
}

// Key builders
export const eventsKey = (dk) => `events-${dk}`;
export const todosKey = (dk) => `todos-${dk}`;
export const mealsKey = (dk) => `meals-${dk}`;
export const remindersKey = (dk) => `reminders-${dk}`;
export const habitsKey = () => "habits";
export const checksKey = (year, week) => `checks-${year}-W${week}`;
export const recipesKey = () => "recipes";
export const goalsKey = () => "goals";

// ---------------------------------------------------------------------------
// Planner snapshot helpers (used for cloud backup)
// ---------------------------------------------------------------------------

// Prefixes for per-day / per-week keys and the fixed standalone keys that make
// up a user's complete planner.
const PLANNER_PREFIXES = [
  "events-",
  "todos-",
  "meals-",
  "reminders-",
  "checks-",
];
const PLANNER_KEYS = ["habits", "recipes", "goals"];

function isPlannerKey(key) {
  if (PLANNER_KEYS.includes(key)) return true;
  return PLANNER_PREFIXES.some((prefix) => key.startsWith(prefix));
}

// Read every planner entry from localStorage as a { key: rawJsonString } map.
export function getAllPlannerData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && isPlannerKey(key)) {
      data[key] = localStorage.getItem(key);
    }
  }
  return data;
}

// Overwrite localStorage planner entries with a snapshot map. Existing planner
// keys not present in the snapshot are removed so the device mirrors the cloud.
export function setAllPlannerData(data) {
  if (!data || typeof data !== "object") return;

  // Remove current planner keys that are not in the incoming snapshot.
  const incoming = new Set(Object.keys(data));
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && isPlannerKey(key) && !incoming.has(key)) {
      toRemove.push(key);
    }
  }
  toRemove.forEach((key) => localStorage.removeItem(key));

  // Write the snapshot values.
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === "string") {
      localStorage.setItem(key, value);
    }
  });
}

// Remove every planner entry from localStorage (used when switching users so
// one account never sees or uploads another account's planner).
export function clearPlannerData() {
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && isPlannerKey(key)) {
      toRemove.push(key);
    }
  }
  toRemove.forEach((key) => localStorage.removeItem(key));
}

// ---------------------------------------------------------------------------
// Save subscription – lets the backup layer react to local changes.
// ---------------------------------------------------------------------------

const saveListeners = new Set();

function notifySave(key) {
  if (!isPlannerKey(key)) return;
  saveListeners.forEach((listener) => {
    try {
      listener(key);
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeToSaves(listener) {
  saveListeners.add(listener);
  return () => saveListeners.delete(listener);
}

// State that mirrors a localStorage entry
export function usePersistedState(key, initial) {
  const [state, setState] = useState(() => load(key, initial));
  const [prevKey, setPrevKey] = useState(key);

  // When the key changes (e.g. navigating to another day), reload the value
  // for the new key during render so we never persist stale data under it.
  if (key !== prevKey) {
    setPrevKey(key);
    setState(load(key, initial));
  }

  useEffect(() => {
    save(key, state);
  }, [key, state]);

  return [state, setState];
}
