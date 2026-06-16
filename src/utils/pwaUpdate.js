// Service worker registration with automatic, cost-free auto-update.
//
// vite-plugin-pwa is configured with `registerType: 'autoUpdate'` and
// `injectRegister: false`, so we register the SW here ourselves to control
// exactly when updates are detected and applied:
//   1. On every app launch / when the app regains focus we ask the SW to
//      check the server for a new version (a tiny conditional GET; free).
//   2. As soon as a new version is ready we activate it and reload once,
//      so the user always gets the latest code without reinstalling.
//
// This is entirely static (GitHub Pages + the browser cache). It does NOT
// touch Firebase, so it never generates any extra cost.

import { registerSW } from 'virtual:pwa-register'

export function setupPwaAutoUpdate() {
  // Reload the page only once, right after the new SW takes control.
  let reloading = false

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return

      const checkForUpdate = () => {
        // Only check when online and the tab is visible to avoid noise.
        if (navigator.onLine && document.visibilityState === 'visible') {
          registration.update().catch(() => {})
        }
      }

      // Check when the app is reopened / brought to the foreground (key on iOS,
      // where the standalone PWA stays alive in the background for a long time).
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate()
      })
      window.addEventListener('focus', checkForUpdate)
      window.addEventListener('online', checkForUpdate)

      // Safety net: also poll every hour while the app stays open.
      setInterval(checkForUpdate, 60 * 60 * 1000)
    },
    onNeedRefresh() {
      // A new version is waiting: activate it and reload automatically.
      if (reloading) return
      reloading = true
      updateSW(true)
    },
  })
}