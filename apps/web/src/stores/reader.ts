import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const KEY = 'mawlid-reader'

/* Die Grenzen stammen aus der alten App und sind nicht willkürlich: unter
   0,7 wird vokalisiertes Arabisch unleserlich, über 1,6 passt auf einem
   Telefon kein halber Vers mehr in eine Zeile. */
const AR_MIN = 0.7
const AR_MAX = 1.6
const AR_STEP = 0.1
const LATIN_MIN = 0.8
const LATIN_MAX = 1.8
const LATIN_STEP = 0.1

export type ReaderView = 'study' | 'book'

interface Saved {
  view?: ReaderView
  arScale?: number
  latinScale?: number
  showTransliteration?: boolean
  showTranslation?: boolean
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Saved) : {}
  } catch {
    return {}
  }
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
/* Fließkomma: 0.7 + 0.1 ergibt 0.7999999999999999. Ohne Runden sammeln sich
   die Reste und der gespeicherte Wert wird mit der Zeit krumm. */
const round1 = (v: number) => Math.round(v * 10) / 10

export const useReader = defineStore('reader', () => {
  const saved = load()

  /* Die Buchansicht ist die Voreinstellung — wie in der Vorlage
     (state.pageView: true). Werke ohne Folio-Angaben fallen in der Ansicht
     selbst auf die Lesefassung zurück. */
  const view = ref<ReaderView>(saved.view ?? 'book')
  const arScale = ref(clamp(saved.arScale ?? 1, AR_MIN, AR_MAX))
  const latinScale = ref(clamp(saved.latinScale ?? 1, LATIN_MIN, LATIN_MAX))
  const showTransliteration = ref(saved.showTransliteration ?? true)
  const showTranslation = ref(saved.showTranslation ?? true)

  /* Vollbild wird bewusst NICHT gespeichert. Wer die App öffnet und sofort im
     Vollbild landet, ohne zu wissen warum, sucht den Ausgang. */
  const immersive = ref(false)

  watch(
    [view, arScale, latinScale, showTransliteration, showTranslation],
    () => {
      try {
        localStorage.setItem(
          KEY,
          JSON.stringify({
            view: view.value,
            arScale: arScale.value,
            latinScale: latinScale.value,
            showTransliteration: showTransliteration.value,
            showTranslation: showTranslation.value,
          } satisfies Saved),
        )
      } catch {
        /* Privater Modus. Die Einstellung gilt für diese Sitzung. */
      }
    },
    { deep: false },
  )

  /* Die beiden Regler wirken über zwei Laufzeit-Tokens auf das ganze Dokument.
     Das ist Absicht: die Verskarte im Leser und der Manuskripttext im Buch
     sollen dieselbe Größe haben, ohne dass eine Komponente von der anderen
     weiß. Die Basis 1,9rem ist der Wert aus tokens.css. */
  watch(
    [arScale, latinScale],
    ([ar, latin]) => {
      const root = document.documentElement
      root.style.setProperty('--ar-size', `${1.9 * ar}rem`)
      root.style.setProperty('--latin-scale', String(latin))
    },
    { immediate: true },
  )

  watch(immersive, (on) => {
    document.documentElement.classList.toggle('immersive', on)
  })

  return {
    view,
    arScale,
    latinScale,
    showTransliteration,
    showTranslation,
    immersive,

    setView: (v: ReaderView) => (view.value = v),
    toggleImmersive: () => (immersive.value = !immersive.value),
    leaveImmersive: () => (immersive.value = false),

    arBigger: () => (arScale.value = round1(clamp(arScale.value + AR_STEP, AR_MIN, AR_MAX))),
    arSmaller: () => (arScale.value = round1(clamp(arScale.value - AR_STEP, AR_MIN, AR_MAX))),
    latinBigger: () =>
      (latinScale.value = round1(clamp(latinScale.value + LATIN_STEP, LATIN_MIN, LATIN_MAX))),
    latinSmaller: () =>
      (latinScale.value = round1(clamp(latinScale.value - LATIN_STEP, LATIN_MIN, LATIN_MAX))),

    canArGrow: () => arScale.value < AR_MAX,
    canArShrink: () => arScale.value > AR_MIN,
    canLatinGrow: () => latinScale.value < LATIN_MAX,
    canLatinShrink: () => latinScale.value > LATIN_MIN,
  }
})
