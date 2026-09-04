/* Autoscroll zum Mitrezitieren.
 *
 * Neun Stufen, 0,14 bis 0,70 Pixel je Bild. Der Bereich liegt ganz am
 * langsamen Ende, und das ist Absicht: schneller ist zum Mitsprechen
 * unbrauchbar. Die oberste Stufe heißt „1×", nicht weil sie schnell wäre,
 * sondern weil sie das gemeinte Tempo ist.
 */

import { onBeforeUnmount, readonly, ref } from 'vue'

export const SCROLL_SPEEDS = [0.14, 0.21, 0.28, 0.35, 0.42, 0.49, 0.56, 0.63, 0.7] as const
export const SCROLL_LABELS = [
  '0.2×',
  '0.3×',
  '0.4×',
  '0.5×',
  '0.6×',
  '0.7×',
  '0.8×',
  '0.9×',
  '1×',
] as const

export function useAutoScroll() {
  const running = ref(false)
  const speedIndex = ref(4)

  let frame: number | null = null
  let accumulated = 0

  function step() {
    if (!running.value) return

    /* Die Geschwindigkeit wird BEI JEDEM BILD neu gelesen. So greift eine
       Änderung sofort, ohne die Schleife neu zu starten. */
    accumulated += SCROLL_SPEEDS[speedIndex.value] ?? 0.42

    if (accumulated >= 1) {
      const dy = Math.floor(accumulated)
      accumulated -= dy
      window.scrollBy(0, dy)
      if (window.innerHeight + Math.ceil(window.scrollY) >= document.body.scrollHeight - 1) {
        stop()
        return
      }
    }
    frame = requestAnimationFrame(step)
  }

  function start() {
    if (running.value) return
    running.value = true
    accumulated = 0
    frame = requestAnimationFrame(step)
    /* Wer selbst scrollt, will die Steuerung zurück. */
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('touchmove', stop, { passive: true })
  }

  function stop() {
    running.value = false
    if (frame !== null) {
      cancelAnimationFrame(frame)
      frame = null
    }
    window.removeEventListener('wheel', stop)
    window.removeEventListener('touchmove', stop)
  }

  const setSpeed = (delta: number) => {
    speedIndex.value = Math.min(SCROLL_SPEEDS.length - 1, Math.max(0, speedIndex.value + delta))
  }

  onBeforeUnmount(stop)

  return {
    running: readonly(running),
    speedIndex: readonly(speedIndex),
    label: () => SCROLL_LABELS[speedIndex.value] ?? '',
    toggle: () => (running.value ? stop() : start()),
    start,
    stop,
    faster: () => setSpeed(1),
    slower: () => setSpeed(-1),
  }
}
