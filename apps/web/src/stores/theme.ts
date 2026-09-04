import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const KEY = 'mawlid-theme'

/* Der Dunkelmodus ist ein Klassenumschalter, keine reine Media-Query: die
   Wahl der Person hat Vorrang vor der Systemeinstellung. Die Systemeinstellung
   liefert nur den Startwert, solange noch nie gewählt wurde — genau wie in der
   alten App. */
function initial(): boolean {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'dark') return true
    if (saved === 'light') return false
  } catch {
    /* Privater Modus: nicht lesbar, kein Grund zu scheitern. */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export const useTheme = defineStore('theme', () => {
  const dark = ref(initial())

  watch(
    dark,
    (on) => {
      document.documentElement.classList.toggle('dark', on)
      try {
        localStorage.setItem(KEY, on ? 'dark' : 'light')
      } catch {
        /* siehe oben */
      }
    },
    { immediate: true },
  )

  return { dark, toggle: () => (dark.value = !dark.value) }
})
