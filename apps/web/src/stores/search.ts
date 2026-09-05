import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

/* Die Suche der Vorlage ist EIN Zustand für die ganze App: von jedem Bereich
   aus wird alles durchsucht, und der Begriff bleibt beim Navigieren stehen —
   wer aus einem Treffer zurückkommt, steht wieder in seiner Trefferliste.
   Nur die Startseite räumt ihn ab (goHome() der Vorlage); das macht hier
   die Masthead-Navigation über clear(). */
export const useSearch = defineStore('search', () => {
  const query = ref('')

  /* Die Vorlage filtert bei jedem Tastendruck — aber gegen Arrays im
     Speicher. Hier steht ein HTTP-Aufruf dahinter; die Anfrage wartet einen
     Wimpernschlag, damit „muhamad" eine Anfrage wird und nicht sieben. Die
     Oberfläche liest weiter `query` (sofort), nur die Abfrage das Gebremste. */
  const debounced = ref('')
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(query, (value) => {
    clearTimeout(timer)
    if (value === '') {
      debounced.value = ''
      return
    }
    timer = setTimeout(() => {
      debounced.value = value
    }, 160)
  })

  const active = computed(() => query.value !== '')

  const clear = () => {
    query.value = ''
  }

  return { query, debounced, active, clear }
})
