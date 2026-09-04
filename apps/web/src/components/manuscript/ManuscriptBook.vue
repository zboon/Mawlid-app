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

const reader = useReader()
const { spread } = useSpread()

const leaves = computed(() => buildLeaves(props.work))
const head = computed(() => runningHead(props.work))

const book = ref<HTMLElement | null>(null)
const current = ref(0)

/* Alles, was die Blattgröße ändert, löst eine neue Messung aus: ein anderes
   Werk, Vollbild, die Doppelseite, das Audio-Dock. */
useManuscriptFit(book, () => [props.work.slug, reader.immersive, spread.value, leaves.value.length])

function goTo(index: number) {
  const el = book.value
  const sheet = el?.children[index] as HTMLElement | undefined
  if (!el || !sheet) return
  el.scrollTo({ left: sheet.offsetLeft, behavior: 'smooth' })
}

function step(delta: number) {
  goTo(
    Math.min(
      leaves.value.length - 1,
      Math.max(0, current.value + (spread.value ? delta * 2 : delta)),
    ),
  )
}

/* Welches Blatt liegt vorn? In RTL sind die Offsets negativ, deshalb wird mit
   Beträgen gerechnet statt mit Vorzeichen. */
function syncDots() {
  const el = book.value
  if (!el) return
  const width = (el.firstElementChild as HTMLElement | null)?.clientWidth || el.clientWidth || 1
  current.value = Math.round(Math.abs(el.scrollLeft) / width)
}

watch(
  () => props.work.slug,
  () => {
    current.value = 0
    book.value?.scrollTo({ left: 0 })
  },
)
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
        :disabled="current >= leaves.length - 1"
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
        :disabled="current === 0"
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
