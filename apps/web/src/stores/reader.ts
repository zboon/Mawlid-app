import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { DisplaySettings } from '@mawalid/shared'
import { mePut } from '@/api/me'

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
  twoPages?: boolean
  scrollSpeedIdx?: number
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
  /* Die Doppelseite ist eine WAHL, keine Automatik: die Vorlage bietet sie ab
     900 px Breite an („Two pages") und lässt sie aus, bis jemand sie
     einschaltet (localStorage SPREAD_KEY). Eine Automatik halbierte auf
     einem Laptop ungefragt die Blattbreite — genau so fiel es auf. */
  const twoPages = ref(saved.twoPages ?? false)
  /* Das Autoscroll-Tempo, Stufe 0–8. Voreinstellung 3 wie in der Vorlage
     (state.scrollSpeedIdx: 3); in ihr ging die Wahl beim Neuladen verloren. */
  const scrollSpeedIdx = ref(Math.min(8, Math.max(0, Math.round(saved.scrollSpeedIdx ?? 3))))

  /* Welche Regler auf DIESEM Gerät je angefasst wurden: nur die Lücken darf
     der Serverabgleich füllen — die eigene Wahl schlägt die Sicherung. */
  const touched = new Set(Object.keys(saved))

  /* Vollbild wird bewusst NICHT gespeichert. Wer die App öffnet und sofort im
     Vollbild landet, ohne zu wissen warum, sucht den Ausgang. */
  const immersive = ref(false)

  watch(
    [view, arScale, latinScale, showTransliteration, showTranslation, twoPages, scrollSpeedIdx],
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
            twoPages: twoPages.value,
            scrollSpeedIdx: scrollSpeedIdx.value,
          } satisfies Saved),
        )
      } catch {
        /* Privater Modus. Die Einstellung gilt für diese Sitzung. */
      }
    },
    { deep: false },
  )

  /* Dieselben Werte, verzögert zur Sicherung auf den Server (Zone 2). Ob das
     ankommt, entscheidet nie über die Bedienung — gerendert wird von hier. */
  let pushTimer: ReturnType<typeof setTimeout> | undefined
  watch(
    [view, arScale, latinScale, showTransliteration, showTranslation, twoPages, scrollSpeedIdx],
    () => {
      clearTimeout(pushTimer)
      pushTimer = setTimeout(() => {
        void mePut('/settings', {
          viewMode: view.value,
          arScale: arScale.value,
          latinScale: latinScale.value,
          showTransliteration: showTransliteration.value,
          showTranslation: showTranslation.value,
          twoPages: twoPages.value,
          scrollSpeedIdx: scrollSpeedIdx.value,
        }).catch((err) => console.warn('[reader] Einstellungs-Sicherung fehlgeschlagen:', err))
      }, 800)
    },
    { deep: false },
  )

  /* Die Sicherung vom Server, beim Start: sie füllt NUR, was auf diesem
     Gerät nie angefasst wurde — ein frisches Gerät bekommt die gewohnten
     Regler, ein benutztes behält seine. */
  function applyServerSettings(s: DisplaySettings | null) {
    if (!s) return
    if (!touched.has('view') && s.viewMode !== null) view.value = s.viewMode
    if (!touched.has('arScale') && s.arScale !== null)
      arScale.value = clamp(s.arScale, AR_MIN, AR_MAX)
    if (!touched.has('latinScale') && s.latinScale !== null)
      latinScale.value = clamp(s.latinScale, LATIN_MIN, LATIN_MAX)
    if (!touched.has('showTransliteration') && s.showTransliteration !== null)
      showTransliteration.value = s.showTransliteration
    if (!touched.has('showTranslation') && s.showTranslation !== null)
      showTranslation.value = s.showTranslation
    if (!touched.has('twoPages') && s.twoPages !== null) twoPages.value = s.twoPages
    if (!touched.has('scrollSpeedIdx') && s.scrollSpeedIdx !== null)
      scrollSpeedIdx.value = Math.min(8, Math.max(0, s.scrollSpeedIdx))
  }

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
    twoPages,
    scrollSpeedIdx,
    immersive,
    applyServerSettings,

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
