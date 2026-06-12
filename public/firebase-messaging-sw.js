/* eslint-disable no-undef */
// Dedicated Firebase Cloud Messaging service worker.
// It receives push messages while the app is in the background/closed and
// shows them as system notifications (required for iOS PWA push).
//
// The Firebase web config is passed as query params when the app registers
// this worker, so no secrets need to live in this static file.

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js",
);

const params = new URL(self.location).searchParams;
firebase.initializeApp({
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  storageBucket: params.get("storageBucket"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
});

const messaging = firebase.messaging();

// Show background notifications. The Cloud Function sends a `notification`
// payload (required so iOS displays it). When that payload is present the
// browser/OS already shows the notification, so we must NOT show it again here
// or it would appear twice. We only show one manually for data-only fallbacks.
messaging.onBackgroundMessage((payload) => {
  if (payload.notification) return; // ya la muestra el sistema; evitar duplicado
  const title = (payload.data && payload.data.title) || "My Planner";
  const body = (payload.data && payload.data.body) || "";
  self.registration.showNotification(title, {
    body,
    icon: "./pwa-192x192.png",
    badge: "./pwa-64x64.png",
    data: payload.data || {},
  });
});

// Focus or open the app when a notification is tapped.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ("focus" in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow("./");
      }),
  );
});
