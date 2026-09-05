<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { WorkDetail } from '@mawalid/shared'
import { buildLeaves, runningHead } from '@/lib/pages'
import { useManuscriptFit } from '@/composables/useManuscriptFit'
import { useSpread } from '@/composables/useSpread'
import { useReader } from '@/stores/reader'
import ManuscriptDefs from './ManuscriptDefs.vue'
import ManuscriptLeaf from './ManuscriptLeaf.vue'

const props = defineProps<{ work: WorkDetail; locale: string }>()

/* Am letzten Blatt geht es in den nächsten Abschnitt weiter, statt tot zu
   enden — wie msStep() der Vorlage über nextPiece(). Die Navigation macht
   die Ansicht darüber; hier wird nur gemeldet, dass das Buch zu Ende ist. */
const emit = defineEmits<{ continue: [] }>()

const reader = useReader()
const { offered } = useSpread()
/* Angeboten UND gewählt — wie spreadOn() der Vorlage. Fällt das Angebot weg
   (Fenster schmaler), fällt die Ansicht von selbst auf ein Blatt zurück. */
const spread = computed(() => offered.value && reader.twoPages)

const leaves = computed(() => buildLeaves(props.work))
const head = computed(() => runningHead(props.work))

const book = ref<HTMLElement | null>(null)
const current = ref(0)

/* Alles, was die Blattgröße ändert, löst eine neue Messung aus: ein anderes
   Werk, Vollbild, die Doppelseite, das Audio-Dock. */
useManuscriptFit(book, () => [props.work.slug, reader.immersive, spread.value, leaves.value.length])

/* Blättern wie msGoTo() der Vorlage: scrollIntoView, KEINE
   scrollLeft-Arithmetik. Der erste Wurf rechnete mit `sheet.offsetLeft` —
   das bezieht sich mangels positioniertem Vorfahren auf den Seitenkörper,
   nicht auf den Scroller, und je nach Fensterbreite schnappte der
   Einrastzwang aufs alte Blatt zurück: der Knopf wirkte tot. Auf der
   Testbreite fiel die Rundung zufällig richtig — deshalb hat es der
   Prüflauf zuerst nicht gesehen. */
function goTo(index: number) {
  const el = book.value
  const target = spread.value ? index - (index % 2) : index
  const sheet = el?.children[target] as HTMLElement | undefined
  if (!el || !sheet) return
  sheet.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  /* Oben am Blatt landen, nicht dort, wo das vorige hingescrollt war. */
  requestAnimationFrame(() => {
    const top = el.getBoundingClientRect().top + window.scrollY - 8
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  })
}

/* Blättern, wortgleich mit msStep() der Vorlage: die Doppelseite wendet zwei
   Blätter auf einmal und rastet auf gerade Blätter ein; das letzte Blatt
   vorwärts öffnet den nächsten Abschnitt. */
function step(delta: number) {
  const count = leaves.value.length
  if (spread.value) {
    const from = current.value - (current.value % 2)
    const next = from + delta * 2
    if (delta > 0 && next >= count) {
      emit('continue')
      return
    }
    goTo(Math.max(0, Math.min(next, count - 1)))
    return
  }
  if (delta > 0 && current.value >= count - 1) {
    emit('continue')
    return
  }
  goTo(Math.max(0, Math.min(current.value + delta, count - 1)))
}

const atStart = computed(() => current.value === 0)
const atEnd = computed(() =>
  spread.value
    ? current.value - (current.value % 2) + 2 >= leaves.value.length
    : current.value >= leaves.value.length - 1,
)
/* Der Weiter-Pfeil bleibt am Ende aktiv, wenn es einen nächsten Abschnitt
   gibt — genau dann führt er dorthin. */
const nextDisabled = computed(() => atEnd.value && !props.work.next)

/* Welches Blatt liegt vorn? Wie msCurrentPage() der Vorlage: das Blatt,
   dessen Mitte der Mitte des Scrollers am nächsten liegt. Reine Geometrie —
   keine scrollLeft-Deutung, deren Vorzeichen in RTL je nach Browser
   verschieden ausfällt. */
function syncDots() {
  const el = book.value
  if (!el) return
  const mid = el.getBoundingClientRect().left + el.clientWidth / 2
  let best = 0
  let bestDistance = Infinity
  for (const [i, sheet] of [...el.children].entries()) {
    const r = sheet.getBoundingClientRect()
    const d = Math.abs(r.left + r.width / 2 - mid)
    if (d < bestDistance) {
      bestDistance = d
      best = i
    }
  }
  current.value = best
}

watch(
  () => props.work.slug,
  () => {
    current.value = 0
    book.value?.scrollTo({ left: 0 })
  },
)

/* Der Suchsprung: das Blatt mit dem Vers aufschlagen und die Stelle
   aufblitzen lassen — wie scrollToVerse() der Vorlage. Ein Vers kann über
   mehrere Blätter laufen; gesucht wird das Teilstück, das den getroffenen
   Abschnitt trägt, sonst das erste. Liefert false, wenn der Vers (noch)
   nicht im Dokument steht — der Aufrufer versucht es dann nach der
   Höhenanpassung noch einmal. */
function jumpToVerse(position: number, seg: number | null): boolean {
  const el = book.value
  if (!el) return false
  const parts = [...el.querySelectorAll<HTMLElement>(`[data-vers="${position}"]`)]
  if (parts.length === 0) return false

  let target = parts[0] as HTMLElement
  let segEl: HTMLElement | null = null
  if (seg !== null) {
    for (const part of parts) {
      const found = part.querySelector<HTMLElement>(`.seg[data-sg="${seg}"]`)
      if (found) {
        target = part
        segEl = found
        break
      }
    }
  }

  target.closest('.ms-sheet')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  syncDots()
  const r = target.getBoundingClientRect()
  if (r.top < 84 || r.bottom > window.innerHeight - 8) {
    window.scrollTo({ top: Math.max(0, r.top + window.scrollY - 96) })
  }
  const flashEl = segEl ?? target
  const cls = segEl ? 'seg-flash' : 'ms-flash'
  flashEl.classList.remove(cls)
  void flashEl.offsetWidth
  flashEl.classList.add(cls)
  return true
}

defineExpose({ jumpToVerse })
</script>

<template>
  <div class="ms theme-manuscript">
    <ManuscriptDefs />

    <p class="ms-hint">Nach links blättern · von rechts nach links lesen</p>

    <div ref="book" class="ms-book" :class="{ spread }" @scroll.passive="syncDots">
      <ManuscriptLeaf
        v-for="(leaf, i) in leaves"
        :key="i"
        :leaf="leaf"
        :index="i"
        :total="leaves.length"
        :running-head="head"
        :annotations="work.annotations"
        :locale="locale"
      />
    </div>

    <div class="ms-nav">
      <button
        class="arrow"
        type="button"
        :disabled="nextDisabled"
        aria-label="Nächstes Blatt"
        @click="step(1)"
      >
        ‹
      </button>
      <div class="dots">
        <button
          v-for="(_, i) in leaves"
          v-show="!(spread && i % 2)"
          :key="i"
          class="dot"
          :class="{ on: spread ? Math.floor(current / 2) === Math.floor(i / 2) : current === i }"
          type="button"
          :aria-label="`Blatt ${i + 1}`"
          @click="goTo(i)"
        />
      </div>
      <button
        class="arrow"
        type="button"
        :disabled="atStart"
        aria-label="Vorheriges Blatt"
        @click="step(-1)"
      >
        ›
      </button>
    </div>

    <!-- Die schwebenden Pfeile — immer in Reichweite, oben wie unten auf dem
         Blatt. Ohne sie ist die Buchansicht am Rechner nicht blätterbar: Wischen
         gibt es dort nicht, und die Leiste unten liegt unter einem blatthohen
         Bild. Auf schmalen Bildschirmen lägen sie ÜBER dem Text und gehen weg —
         dort wischt man. Wortgleich mit .ms-float der Vorlage. -->
    <div class="ms-float">
      <button
        class="arrow"
        type="button"
        :disabled="nextDisabled"
        aria-label="Nächstes Blatt"
        @click="step(1)"
      >
        ‹
      </button>
      <button
        class="arrow"
        type="button"
        :disabled="atStart"
        aria-label="Vorheriges Blatt"
        @click="step(-1)"
      >
        ›
      </button>
    </div>
  </div>
</template>

<style scoped>
.ms-hint {
  text-align: center;
  font-family: var(--font-serif);
  font-size: var(--text-sm);
  color: var(--ink-soft);
  padding: 0 var(--space-xl) var(--space-md);
}

/* Die Blätter liegen in einer Reihe und blättern von rechts nach links, wie
   ein arabisches Buch. */
.ms-book {
  display: flex;
  direction: rtl;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  align-items: flex-start;
  scrollbar-width: none;
  padding-bottom: var(--space-2xs);
}

.ms-book::-webkit-scrollbar {
  display: none;
}

/* Doppelseite: der Scroller ist schon RTL, das frühere Blatt liegt also
   RECHTS und sein Paar links — so wie das gedruckte Buch aufschlägt. Nur die
   UNGERADEN Kinder rasten ein, damit ein Wisch ein ganzes Paar weiterblättert;
   in RTL ist die Startkante des ungeraden Kindes seine rechte, was das Paar
   genau richtig setzt. */
.ms-book.spread :deep(.ms-sheet) {
  flex: 0 0 50%;
  max-width: none;
  padding: 0 var(--space-xs);
  scroll-snap-align: none;
}

.ms-book.spread :deep(.ms-sheet:nth-child(odd)) {
  scroll-snap-align: start;
}

.ms-book.spread :deep(.ms-page) {
  min-height: min(72dvh, calc((50vw - 1.4rem) * 1.2));
}

.ms-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xl);
  padding: var(--space-md) 0 var(--space-2xl);
}

.ms-float {
  position: fixed;
  top: 50%;
  inset-inline: 0;
  transform: translateY(-50%);
  display: flex;
  justify-content: space-between;
  padding: 0 var(--space-sm);
  pointer-events: none;
  z-index: var(--z-nav);
}

.ms-float .arrow {
  pointer-events: auto;
}

@media (max-width: 560px) {
  .ms-float {
    display: none;
  }
}

/* Die erste Seite liegt rechts, so wie der Text gelesen wird. */
.dots {
  display: flex;
  direction: rtl;
  gap: var(--space-xs);
}

.arrow {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-circle);
  border: 1px solid var(--accent);
  color: var(--accent);
  background: var(--surface-card);
  opacity: 0.88;
  box-shadow: var(--shadow-md);
  font-size: var(--text-2xl);
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    opacity var(--duration-fast) var(--ease),
    background var(--duration-fast) var(--ease);
}

.arrow:disabled {
  opacity: 0.2;
  cursor: default;
  box-shadow: none;
}

.arrow:not(:disabled):active {
  background: var(--accent-wash);
  opacity: 1;
}

.dot {
  width: 0.62rem;
  height: 0.62rem;
  border-radius: var(--radius-circle);
  flex: 0 0 auto;
  border: 1px solid var(--accent);
  background: transparent;
  opacity: 0.55;
  transition:
    opacity var(--duration-fast) var(--ease),
    background var(--duration-fast) var(--ease);
}

.dot.on {
  background: var(--accent);
  opacity: 1;
}
</style>
