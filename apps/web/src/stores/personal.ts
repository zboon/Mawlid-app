import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { FavoriteEntry, MarkEntry, PositionEntry, ViewMode } from '@mawalid/shared'
import { fetchMe, meDelete, mePut } from '@/api/me'
import { useReader } from './reader'

/* Favoriten, Lesepositionen, Markierungen — die Daten der Person.
 *
 * Gerendert wird IMMER aus dem lokalen Spiegel: er ist sofort da, auch ohne
 * Netz, wie der localStorage der Vorlage. Die API ist die Sicherung, die das
 * Gerät überdauert; jeder Handgriff wird ihr nachgereicht, und ob das klappt,
 * entscheidet nie über die Bedienung (04-backend-api.md, „Immer auch lokal").
 *
 * Der Abgleich beim Start ist bewusst einfach:
 *   - Ist der Spiegel LEER (frisches Gerät, geleerter Browser), wird der
 *     Serverstand übernommen — der Wiederherstellungsfall.
 *   - Sonst ist der Spiegel die Wahrheit dieses Geräts: Fehlendes wird zum
 *     Server HOCHgereicht, nichts wird heruntergemischt. Eine Vereinigung
 *     in beide Richtungen würde hier Gelöschtes wiederbeleben; das Mischen
 *     zwischen mehreren Geräten kommt mit den Konten in Phase 5.
 */

type WorkRef = Pick<FavoriteEntry, 'module' | 'collection' | 'work' | 'titles' | 'hasFolios'>

/* Lokal trägt eine Markierung zusätzlich ihre Sammlung — nur damit „Clear"
   eines Bereichs sie findet, ohne alle Werke zu laden. Der Server braucht
   das nicht (er löst über den Vers auf). */
export type LocalMark = MarkEntry & { collection: string }

interface Mirror {
  favorites: FavoriteEntry[]
  positions: PositionEntry[]
  marks: LocalMark[]
}

const KEY = 'mawlid-personal'

function load(): Mirror | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Mirror) : null
  } catch {
    return null
  }
}

/* Ein fehlgeschlagener Abgleich ist Alltag (offline, API aus) und darf die
   Bedienung nicht berühren. Er landet in der Konsole, nirgendwo sonst. */
const quiet = (p: Promise<unknown>) => {
  void p.catch((err) => console.warn('[personal] Abgleich fehlgeschlagen:', err))
}

const workKey = (collection: string, work: string) => `${collection}/${work}`

export const usePersonal = defineStore('personal', () => {
  const stored = load()
  const favorites = ref<FavoriteEntry[]>(stored?.favorites ?? [])
  const positions = ref<PositionEntry[]>(stored?.positions ?? [])
  const marks = ref<LocalMark[]>(stored?.marks ?? [])
  /* Ob je etwas gespeichert war, entscheidet die Abgleichsrichtung oben. */
  const hadMirror = stored !== null

  watch(
    [favorites, positions, marks],
    () => {
      try {
        localStorage.setItem(
          KEY,
          JSON.stringify({
            favorites: favorites.value,
            positions: positions.value,
            marks: marks.value,
          } satisfies Mirror),
        )
      } catch {
        /* Privater Modus: gilt für diese Sitzung. */
      }
    },
    { deep: true },
  )

  /* ── Favoriten ───────────────────────────────────────────────────────── */

  const isFavorite = (collection: string, work: string) =>
    favorites.value.some((f) => f.collection === collection && f.work === work)

  function toggleFavorite(entry: WorkRef) {
    const at = favorites.value.findIndex(
      (f) => f.collection === entry.collection && f.work === entry.work,
    )
    if (at >= 0) {
      favorites.value.splice(at, 1)
      quiet(meDelete(`/favorites/${entry.collection}/${entry.work}`))
      return
    }
    const sortOrder = Math.max(0, ...favorites.value.map((f) => f.sortOrder)) + 10
    favorites.value.push({ ...entry, sortOrder })
    quiet(mePut(`/favorites/${entry.collection}/${entry.work}`, { sortOrder }))
  }

  /* ── Lesepositionen: je Werk eine ────────────────────────────────────── */

  const placeFor = (collection: string, work: string): PositionEntry | null =>
    positions.value.find((p) => p.collection === collection && p.work === work) ?? null

  /* Die Wiederaufnahme-Karte eines Bereichs zeigt EINE Stelle — die
     zuletzt gespeicherte, wie das eine Band der Vorlage. */
  const latestPlaceIn = (collection: string): PositionEntry | null => {
    const inColl = positions.value.filter((p) => p.collection === collection)
    if (inColl.length === 0) return null
    return inColl.reduce((a, b) => (a.updatedAt >= b.updatedAt ? a : b))
  }

  function savePlace(
    entry: WorkRef,
    at: {
      verseId: number | null
      position: number | null
      segmentIndex: number | null
      viewMode: ViewMode
    },
  ) {
    const next: PositionEntry = {
      module: entry.module,
      collection: entry.collection,
      work: entry.work,
      titles: entry.titles,
      verseId: at.verseId,
      position: at.position,
      segmentIndex: at.segmentIndex,
      viewMode: at.viewMode,
      updatedAt: new Date().toISOString(),
    }
    const idx = positions.value.findIndex(
      (p) => p.collection === entry.collection && p.work === entry.work,
    )
    if (idx >= 0) positions.value.splice(idx, 1, next)
    else positions.value.push(next)
    quiet(
      mePut(`/positions/${entry.collection}/${entry.work}`, {
        verseId: at.verseId,
        segmentIndex: at.segmentIndex,
        viewMode: at.viewMode,
      }),
    )
  }

  function liftPlace(collection: string, work: string) {
    const idx = positions.value.findIndex((p) => p.collection === collection && p.work === work)
    if (idx >= 0) positions.value.splice(idx, 1)
    quiet(meDelete(`/positions/${collection}/${work}`))
  }

  /* ── Markierungen ────────────────────────────────────────────────────── */

  const markedSegs = (verseId: number): ReadonlySet<number> =>
    new Set(marks.value.filter((m) => m.verseId === verseId).map((m) => m.segmentIndex))

  function toggleMark(collection: string, verseId: number, segmentIndex: number) {
    const at = marks.value.findIndex(
      (m) => m.verseId === verseId && m.segmentIndex === segmentIndex,
    )
    if (at >= 0) {
      marks.value.splice(at, 1)
      quiet(meDelete(`/marks/${verseId}/${segmentIndex}`))
      return false
    }
    marks.value.push({ collection, verseId, segmentIndex })
    quiet(mePut(`/marks/${verseId}/${segmentIndex}`))
    return true
  }

  /* „Clear" der Vorlage: die gespeicherte Stelle UND alle Markierungen des
     Bereichs in einem Zug (clearDalailPlace räumt beides zusammen ab). */
  function clearCollection(collection: string) {
    positions.value = positions.value.filter((p) => p.collection !== collection)
    marks.value = marks.value.filter((m) => m.collection !== collection)
    quiet(meDelete(`/positions?collection=${encodeURIComponent(collection)}`))
    quiet(meDelete(`/marks?collection=${encodeURIComponent(collection)}`))
  }

  /* ── Abgleich beim Start ─────────────────────────────────────────────── */

  let synced = false
  function sync() {
    if (synced) return
    synced = true
    quiet(
      fetchMe().then((state) => {
        /* Die Regler-Sicherung füllt nur, was hier nie angefasst wurde. */
        useReader().applyServerSettings(state.settings)
        if (!hadMirror) {
          favorites.value = state.favorites
          positions.value = state.positions
          /* Serverseitige Markierungen kennen ihre Sammlung nicht; ohne sie
             findet das Bereichs-Clear sie lokal nicht. Sie kommen mit leerer
             Sammlung herein und werden spätestens vom Server-Clear erfasst. */
          marks.value = state.marks.map((m) => ({ ...m, collection: '' }))
          return
        }
        /* Spiegel vorhanden: Fehlendes hochreichen, nichts heruntermischen. */
        const serverFavs = new Set(state.favorites.map((f) => workKey(f.collection, f.work)))
        for (const f of favorites.value) {
          if (!serverFavs.has(workKey(f.collection, f.work))) {
            quiet(mePut(`/favorites/${f.collection}/${f.work}`, { sortOrder: f.sortOrder }))
          }
        }
        const serverPos = new Map(state.positions.map((p) => [workKey(p.collection, p.work), p]))
        for (const p of positions.value) {
          const remote = serverPos.get(workKey(p.collection, p.work))
          if (!remote || remote.updatedAt < p.updatedAt) {
            quiet(
              mePut(`/positions/${p.collection}/${p.work}`, {
                verseId: p.verseId,
                segmentIndex: p.segmentIndex,
                viewMode: p.viewMode,
              }),
            )
          }
        }
        const serverMarks = new Set(state.marks.map((m) => `${m.verseId}:${m.segmentIndex}`))
        for (const m of marks.value) {
          if (!serverMarks.has(`${m.verseId}:${m.segmentIndex}`)) {
            quiet(mePut(`/marks/${m.verseId}/${m.segmentIndex}`))
          }
        }
      }),
    )
  }

  const favoriteCount = computed(() => favorites.value.length)

  return {
    favorites,
    positions,
    marks,
    favoriteCount,
    isFavorite,
    toggleFavorite,
    placeFor,
    latestPlaceIn,
    savePlace,
    liftPlace,
    markedSegs,
    toggleMark,
    clearCollection,
    sync,
  }
})
