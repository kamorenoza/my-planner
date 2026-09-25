import { useRef } from 'react'

// Hook para detectar swipe horizontal (izquierda/derecha) en mobile/PWA.
// onSwipeLeft: deslizar hacia la izquierda (avanzar).
// onSwipeRight: deslizar hacia la derecha (retroceder).
// options.ignoreSelector: si el gesto inicia dentro de un elemento que hace
//   match con este selector, se ignora (p.ej. tableros con scroll horizontal).
// options.threshold: distancia mínima en px (por defecto 60).
export function useSwipe(onSwipeLeft, onSwipeRight, options = {}) {
  const { ignoreSelector = null, threshold = 60 } = options
  const start = useRef(null)

  const onTouchStart = (e) => {
    if (e.touches.length !== 1) {
      start.current = null
      return
    }
    if (ignoreSelector && e.target.closest && e.target.closest(ignoreSelector)) {
      start.current = null
      return
    }
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY }
  }

  const onTouchEnd = (e) => {
    if (!start.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.current.x
    const dy = t.clientY - start.current.y
    start.current = null
    // El gesto debe ser predominantemente horizontal y superar el umbral.
    if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) return
    if (dx < 0) onSwipeLeft?.()
    else onSwipeRight?.()
  }

  return { onTouchStart, onTouchEnd }
}
