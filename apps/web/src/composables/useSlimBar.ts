/* Der Schlank-Modus der Leseleiste — mit Hysterese.
 *
 * Das Detail, das man leicht falsch baut: beim Scrollen klappt die Bismillah
 * auf Breite null und die Leiste wird flacher. Mit EINER Schwelle entsteht
 * daraus eine Endlosschleife — die Leiste wird flacher, der Inhalt rutscht
 * hoch, das Dokument wird kürzer, `scrollY` fällt unter die Schwelle, die
 * Bismillah kommt zurück. Mehrmals pro Sekunde.
 *
 * Zwei weit auseinanderliegende Schwellen lösen das.
 */

import { onBeforeUnmount, onMounted, ref } from 'vue'

const SLIM_ON = 88
const SLIM_OFF = 32

export function useSlimBar() {
  const slim = ref(false)
  let ticking = false

  /* Gemessen wird in requestAnimationFrame, nicht bei jedem Scroll-Ereignis:
     auf einem Telefon feuert das Ereignis häufiger, als der Bildschirm
     zeichnet. */
  const measure = () => {
    const y = window.scrollY
    if (!slim.value && y > SLIM_ON) slim.value = true
    else if (slim.value && y < SLIM_OFF) slim.value = false
    ticking = false
  }

  const onScroll = () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(measure)
  }

  onMounted(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    measure()
  })
  onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

  return { slim }
}
