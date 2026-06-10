import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
} from "firebase/messaging";
import { doc, setDoc, deleteField, serverTimestamp } from "firebase/firestore";
import app, { db } from "./firebase";

// The VAPID public key generated in Firebase Console
// (Project settings -> Cloud Messaging -> Web Push certificates).
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Base path the app is served from (matches vite `base`). Used to locate the
// dedicated FCM service worker.
const BASE = import.meta.env.BASE_URL || "/";

let messagingPromise = null;

// Resolve a messaging instance only when the browser supports Web Push.
async function getMessagingInstance() {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      if (!(await isSupported())) return null;
      return getMessaging(app);
    })();
  }
  return messagingPromise;
}

export async function notificationsSupported() {
  return (
    typeof Notification !== "undefined" &&
    "serviceWorker" in navigator &&
    (await isSupported())
  );
}

export function notificationPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

// Register the dedicated FCM service worker, passing the Firebase web config as
// query params so the static SW file can initialize without reading env vars.
async function registerFcmServiceWorker() {
  const params = new URLSearchParams({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });
  return navigator.serviceWorker.register(
    `${BASE}firebase-messaging-sw.js?${params.toString()}`,
    { scope: `${BASE}firebase-cloud-messaging-push-scope` },
  );
}

// Ask the user for permission, obtain an FCM token and store it (with the
// device timezone) under the user document so Cloud Functions can target it.
// Returns the token string, or null if not granted / unsupported.
export async function enableNotifications(uid) {
  if (!uid) return null;
  if (!(await notificationsSupported())) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const swRegistration = await registerFcmServiceWorker();
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swRegistration,
  });
  if (!token) return null;

  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Bogota";

  // Store the token keyed by itself so multiple devices can coexist, plus the
  // user's timezone and a default 8:00 daily-summary preference.
  await setDoc(
    doc(db, "users", uid),
    {
      timezone,
      notif: {
        enabled: true,
        dailyHour: 8,
        eventLeadMinutes: 60,
        tokens: { [token]: serverTimestamp() },
      },
    },
    { merge: true },
  );

  return token;
}

// Remove a token from the user document (used when turning notifications off).
export async function disableNotifications(uid, token) {
  if (!uid) return;
  const update = { "notif.enabled": false };
  if (token) update[`notif.tokens.${token}`] = deleteField();
  await setDoc(doc(db, "users", uid), update, { merge: true });
}

// Foreground messages: show them as a notification while the app is open.
export async function listenForegroundMessages() {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    const { title, body } = payload.notification || {};
    if (title && Notification.permission === "granted") {
      new Notification(title, { body, icon: `${BASE}pwa-192x192.png` });
    }
  });
}
