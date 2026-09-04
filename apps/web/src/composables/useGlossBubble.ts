/* Die Erklärung, die beim Antippen einer goldenen Glosse erscheint.
 *
 * Der Zustand liegt AUSSERHALB der Komponenten, weil es immer nur eine Blase
 * geben darf — sonst öffnet jede Verskarte ihre eigene.
 *
 * Und sie wird per Teleport an <body> gehängt, nicht in den Text eingefügt:
 * in der Buchansicht misst useManuscriptFit jedes Blatt, und ein zusätzliches
 * Element IM Blatt verschöbe den Seitenumbruch, sobald jemand etwas antippt.
 */

import { ref } from 'vue'

interface Bubble {
  text: string
  x: number
  y: number
  key: string
}

const bubble = ref<Bubble | null>(null)

export function useGlossBubble() {
  function show(event: MouseEvent, text: string, key: string) {
    event.stopPropagation()
    if (!text) return
    /* Nochmal auf dieselbe Glosse tippen schließt sie. */
    if (bubble.value?.key === key) {
      bubble.value = null
      return
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    bubble.value = { text, key, x: rect.left + rect.width / 2, y: rect.bottom }
  }

  const hide = () => {
    bubble.value = null
  }

  return { bubble, show, hide }
}
