/* Die Höhenanpassung der Buchansicht.
 *
 * Der wunde Punkt der ganzen Phase. Er misst echtes DOM, hängt am Zeitpunkt
 * des Schriftladens und läuft bei jeder Größenänderung neu. Er ist der
 * Unterschied zwischen „sieht aus wie ein Manuskript" und „sieht aus wie Text
 * in einem Kasten".
 *
 * Portiert aus `msAutoFit()` der alten App. Was der Algorithmus tut:
 *
 *   1. Jedes Blatt auf seine natürliche Höhe loslassen und messen.
 *   2. EINE gemeinsame Höhe für das Kapitel wählen — das 80. Perzentil, nicht
 *      das höchste Blatt. Die dichtesten Seiten geben etwas Größe ab (der
 *      Unterschied liegt unter zehn Prozent und fällt nicht auf), dafür bleibt
 *      unter keiner Seite ein Streifen leeres Papier.
 *   3. Je Blatt die Schriftgröße zwischen dem 0,6- und 1,9-fachen der
 *      Grundgröße so einstellen, dass der Text den Goldrahmen füllt.
 *
 * Das Schlussblatt bleibt aus der Perzentilrechnung heraus (ein kurzes
 * Schlussblatt würde sonst das ganze Kapitel schrumpfen), und Blätter, die das
 * gedruckte Buch selbst halb leer lässt, ebenfalls.
 */

import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'

const MIN_FACTOR = 0.6
const MAX_FACTOR = 1.9
const PERCENTILE = 0.8
const RESIZE_DEBOUNCE = 150
const GUARD = 30

const playerHeight = () => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--player-h')
  return Number.parseFloat(raw) || 0
}

export function useManuscriptFit(book: Ref<HTMLElement | null>, deps: () => unknown) {
  let resizeTimer: ReturnType<typeof setTimeout> | null = null

  function fit() {
    const root = book.value
    if (!root) return

    const pages = Array.from(root.querySelectorAll<HTMLElement>('.ms-page'))
    if (pages.length === 0) return

    /* Erst alles loslassen: ohne das misst man die Höhe, die der vorige
       Durchlauf gesetzt hat, und das Ergebnis wandert bei jedem Aufruf. */
    const leaves: { page: HTMLElement; text: HTMLElement; base: number; natural: number }[] = []
    for (const page of pages) {
      const text = page.querySelector<HTMLElement>('.ms-text')
      if (!text) continue
      text.style.fontSize = ''
      /* Die CSS-Untergrenze muss beim Messen weg — im Vollbild steht dort
         min-height:100dvh, was verdeckt, wie hoch der Text wirklich will. */
      page.style.minHeight = '0px'
      page.style.height = 'auto'
      leaves.push({
        page,
        text,
        base: Number.parseFloat(getComputedStyle(text).fontSize) || 24,
        natural: 0,
      })
    }
    if (leaves.length === 0) return

    /* Alle Höhen in EINEM Durchgang lesen, nachdem alle Schreibvorgänge
       erledigt sind — sonst rechnet der Browser zwischen jedem Blatt neu. */
    for (const leaf of leaves) leaf.natural = leaf.page.offsetHeight

    const isShort = (leaf: (typeof leaves)[number]) => leaf.page.classList.contains('ms-short')

    let pool = leaves.length > 1 ? leaves.slice(0, -1) : leaves
    if (pool.some((l) => !isShort(l))) pool = pool.filter((l) => !isShort(l))

    const sorted = pool.map((l) => l.natural).sort((a, b) => a - b)
    const index = Math.min(sorted.length - 1, Math.round((sorted.length - 1) * PERCENTILE))
    let height = sorted[index] ?? 0

    const immersive = document.documentElement.classList.contains('immersive')
    /* Die Breite EINES Blattes — in der Doppelseite die halbe Scrollfläche. */
    const leafWidth =
      (root.firstElementChild as HTMLElement | null)?.clientWidth ?? root.clientWidth ?? 360
    height = Math.max(
      height,
      immersive
        ? window.innerHeight - playerHeight()
        : Math.min(window.innerHeight * 0.72, leafWidth * 1.5),
    )

    leaves.forEach((leaf, i) => {
      leaf.page.style.minHeight = '0px'
      leaf.page.style.height = `${height}px`

      const closing = i === leaves.length - 1 && leaves.length > 1
      const min = leaf.base * MIN_FACTOR
      const max = closing || isShort(leaf) ? leaf.base : leaf.base * MAX_FACTOR

      /* Der Platz, der zwischen dem Fuß des Textes und dem Fuß des Inhalts-
         kastens noch frei ist — abgelesen aus dem, was der Browser tatsächlich
         gesetzt hat. Polsterung, Rahmen und Bandhöhen von Hand zu addieren ist
         genau der Fehler, der unter jeder Seite einen Streifen leeres Papier
         stehen lässt. */
      const room = () => {
        const style = getComputedStyle(leaf.page)
        const pageRect = leaf.page.getBoundingClientRect()
        const textRect = leaf.text.getBoundingClientRect()
        const bottom =
          pageRect.bottom -
          Number.parseFloat(style.paddingBottom) -
          Number.parseFloat(style.borderBottomWidth)
        return bottom - textRect.bottom
      }

      /* Die Texthöhe wächst ungefähr mit dem Quadrat der Schriftgröße, ein
         Wurzelschritt landet also schon nah dran; die Schleifen darunter
         setzen es genau. */
      const textHeight = leaf.text.offsetHeight
      const free = room()
      let size =
        textHeight > 0 ? leaf.base * Math.sqrt((textHeight + free) / textHeight) : leaf.base
      size = Math.max(min, Math.min(max, size))
      leaf.text.style.fontSize = `${size}px`

      let guard = 0
      while (room() < 0 && size > min && guard < GUARD) {
        guard += 1
        size = Math.max(min, size * 0.975)
        leaf.text.style.fontSize = `${size}px`
      }

      guard = 0
      while (size < max && guard < GUARD) {
        guard += 1
        const next = Math.min(max, size * 1.02)
        leaf.text.style.fontSize = `${next}px`
        if (room() < 0) {
          leaf.text.style.fontSize = `${size}px`
          break
        }
        size = next
      }
    })
  }

  /* Zweimal requestAnimationFrame: der erste Rahmen legt aus, der zweite hat
     die Maße. Ein einzelner misst zu früh und liefert Nullen. */
  function queue() {
    requestAnimationFrame(() => requestAnimationFrame(fit))
    /* Und noch einmal, wenn die arabische Schrift wirklich da ist: die
       Metrik der Ersatzschrift ist eine andere, der erste Durchgang läge daneben. */
    document.fonts?.ready.then(fit).catch(() => {})
  }

  const onResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(fit, RESIZE_DEBOUNCE)
  }

  onMounted(() => {
    window.addEventListener('resize', onResize)
    queue()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
    if (resizeTimer) clearTimeout(resizeTimer)
  })

  /* Alles, was die Blattgröße ändert: Vollbild, Audio-Dock, ein anderes Werk,
     ein anderer Schriftgrad. */
  watch(deps, queue, { flush: 'post' })

  return { fit, queue }
}
