<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { MediaItem } from '@mawalid/shared'
import AutoScrollBar from '@/components/AutoScrollBar.vue'
import ControlChip from '@/components/ControlChip.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import GlossBubble from '@/components/GlossBubble.vue'
import MediaDock from '@/components/MediaDock.vue'
import NoteBlock from '@/components/NoteBlock.vue'
import ReaderBar from '@/components/ReaderBar.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import VerseCard from '@/components/VerseCard.vue'
import ViewSwitch from '@/components/ViewSwitch.vue'
import ManuscriptBook from '@/components/manuscript/ManuscriptBook.vue'
import { ApiError } from '@/api/client'
import { useWork } from '@/api/queries'
import { useSlimBar } from '@/composables/useSlimBar'
import { useSpread } from '@/composables/useSpread'
import { arabic, latin } from '@/lib/localized'
import { useReader } from '@/stores/reader'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const reader = useReader()
const { slim } = useSlimBar()
const { offered: spreadOffered } = useSpread()

const workSlug = computed(() => String(route.params.work ?? ''))
const moduleSlug = computed(() => String(route.params.module ?? ''))
const collectionSlug = computed(() => String(route.params.collection ?? ''))

const { data, isPending, isError, error, refetch } = useWork(workSlug, collectionSlug, locale)

const work = computed(() => data.value ?? null)
const latinScript = computed(() => work.value?.primaryScript === 'latn')

/* Die Buchansicht gibt es nur, wo es Folio-Angaben gibt. Wer sie zuletzt
   gewählt hatte und dann ein Werk ohne Folios öffnet, bekommt die Lesefassung
   — und nicht eine leere Buchansicht. */
const view = computed(() => (work.value?.hasFolios ? reader.view : 'study'))

/* Autoscroll passt zu einem Stück, das man in einem Zug durchrezitiert. Die
   Dalāʾil und die täglichen Litaneien werden nicht so gelesen — dort wird
   innegehalten —, deshalb bleibt die Leiste bei ihnen aus. Genau wie vorher. */
const NO_AUTOSCROLL = new Set(['dalail', 'ahzab'])
const showAutoScroll = computed(
  () =>
    view.value === 'study' &&
    !NO_AUTOSCROLL.has(moduleSlug.value) &&
    (work.value?.verses.length ?? 0) > 0,
)

const media = ref<MediaItem | null>(null)
const audio = computed(() => work.value?.media.filter((m) => m.kind === 'audio') ?? [])
const video = computed(() => work.value?.media.filter((m) => m.kind === 'video') ?? [])

watch(workSlug, () => {
  media.value = null
})

/* Escape verlässt das Vollbild. Ohne diesen Ausgang ist es auf dem Rechner
   eine Falle: der Knopf zum Schließen liegt außerhalb des Blickfelds, wenn
   man weit unten auf einem Blatt steht. */
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && reader.immersive) reader.leaveImmersive()
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  reader.leaveImmersive()
})

const message = computed(() => {
  if (error.value instanceof ApiError && error.value.code === 'OFFLINE') return t('error.offline')
  if (error.value instanceof ApiError && error.value.status === 404) return t('empty.notFound')
  return t('error.generic')
})

const goTo = (slug: string) => router.push(`/m/${moduleSlug.value}/${collectionSlug.value}/${slug}`)

/* ── Der Suchsprung: /m/…/werk?vers=12&abschnitt=1 ─────────────────────────
 *
 * Die Trefferliste öffnet das Werk mit einer Zieladresse: Verse.position und
 * der Hervorhebungsabschnitt. Gescrollt und geblitzt wird in der Ansicht,
 * die ohnehin aufgeht — Buch wie Lesefassung teilen die Adresse (data-vers),
 * wie scrollToVerse() der Vorlage in beiden Ansichten dieselben Marken
 * findet. */
const jump = computed(() => {
  const vers = Number(route.query.vers)
  if (!Number.isInteger(vers) || vers < 0) return null
  const abschnitt = Number(route.query.abschnitt)
  return {
    position: vers,
    seg: Number.isInteger(abschnitt) && abschnitt >= 0 ? abschnitt : null,
  }
})

const bookRef = ref<InstanceType<typeof ManuscriptBook> | null>(null)

function flashStudy(position: number, seg: number | null): boolean {
  const vEl = document.querySelector<HTMLElement>(`.verses [data-vers="${position}"]`)
  if (!vEl) return false
  window.scrollTo({ top: Math.max(0, vEl.getBoundingClientRect().top + window.scrollY - 84) })
  const segEl = seg !== null ? vEl.querySelector<HTMLElement>(`.seg[data-sg="${seg}"]`) : null
  const el = segEl ?? vEl
  const cls = segEl ? 'seg-flash' : 'hit-flash'
  el.classList.remove(cls)
  void el.offsetWidth
  el.classList.add(cls)
  return true
}

/* Wie afterViewScroll() der Vorlage: nach zwei Frames springen und, wenn die
   Blätter noch nicht vermessen waren (die Schriften landen später und
   verschieben alles), nach einem Augenblick ein zweites Mal. */
watch(
  [jump, work, view],
  async ([j]) => {
    if (!j || !work.value || work.value.verses.length === 0) return
    await nextTick()
    const run = () =>
      view.value === 'book'
        ? (bookRef.value?.jumpToVerse(j.position, j.seg) ?? false)
        : flashStudy(j.position, j.seg)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!run()) setTimeout(run, 280)
      }),
    )
  },
  { immediate: true },
)
</script>

<template>
  <ReaderBar class="bar" :slim="slim" :has-folios="work?.hasFolios ?? false" />

  <main id="main" class="reader">
    <ErrorState
      v-if="isError"
      :message="message"
      :retry-label="t('error.retry')"
      @retry="refetch()"
    />

    <template v-else-if="isPending">
      <SkeletonCard v-for="n in 4" :key="n" />
    </template>

    <template v-else-if="work">
      <header class="reader-head">
        <!-- Die Kartusche ist die Beschriftung des Manuskriptbandes. Bei den
             meisten Werken ist sie wortgleich mit dem arabischen Titel — dann
             stünde dieselbe Zeile zweimal untereinander. -->
        <p
          v-if="work.cartouche && work.cartouche !== arabic(work.titles)"
          class="cartouche"
          lang="ar"
          dir="rtl"
        >
          {{ work.cartouche }}
        </p>
        <h1 v-if="!latinScript && arabic(work.titles)" class="title-ar" lang="ar" dir="rtl">
          {{ arabic(work.titles) }}
        </h1>
        <p class="title-latin">
          <template v-if="work.ordinal !== null">{{ work.ordinal }} · </template
          >{{ latin(work.titles, locale) }}
        </p>
      </header>

      <p v-if="work.langFallback" class="reader-fallback">
        {{
          t('reader.langFallback', {
            lang: t(`lang.${work.lang}`),
            want: t(`lang.${work.langFallback}`),
          })
        }}
      </p>

      <div class="reader-controls">
        <ViewSwitch
          v-if="work.hasFolios"
          :view="view"
          :labels="{ study: t('reader.study'), book: t('reader.book') }"
          :group-label="t('reader.viewSwitch')"
          @select="reader.setView($event)"
        />

        <ControlChip
          v-if="view === 'book' && spreadOffered"
          :label="t('reader.twoPages')"
          :on="reader.twoPages"
          @click="reader.twoPages = !reader.twoPages"
        />

        <ControlChip
          v-if="view === 'book'"
          :label="reader.immersive ? t('reader.leaveImmersive') : t('reader.immersive')"
          variant="icon"
          @click="reader.toggleImmersive()"
        >
          {{ reader.immersive ? '⤡' : '⤢' }}
        </ControlChip>

        <template v-if="view === 'study'">
          <ControlChip
            v-if="!latinScript"
            :label="t('reader.transliteration')"
            :on="reader.showTransliteration"
            @click="reader.showTransliteration = !reader.showTransliteration"
          />
          <ControlChip
            :label="t('reader.translation')"
            :on="reader.showTranslation"
            @click="reader.showTranslation = !reader.showTranslation"
          />
          <ControlChip
            v-if="!latinScript"
            :label="t('reader.arSmaller')"
            variant="size"
            :disabled="!reader.canArShrink()"
            @click="reader.arSmaller()"
          >
            أ−
          </ControlChip>
          <ControlChip
            v-if="!latinScript"
            :label="t('reader.arLarger')"
            variant="size"
            :disabled="!reader.canArGrow()"
            @click="reader.arBigger()"
          >
            أ+
          </ControlChip>
          <ControlChip
            :label="t('reader.latinSmaller')"
            variant="size"
            :disabled="!reader.canLatinShrink()"
            @click="reader.latinSmaller()"
          >
            a−
          </ControlChip>
          <ControlChip
            :label="t('reader.latinLarger')"
            variant="size"
            :disabled="!reader.canLatinGrow()"
            @click="reader.latinBigger()"
          >
            a+
          </ControlChip>
        </template>
      </div>

      <NoteBlock v-if="latin(work.notes, locale)" :text="latin(work.notes, locale)" />

      <div v-if="view === 'study' && (audio.length || video.length)" class="reader-media">
        <button
          v-for="(m, i) in audio"
          :key="`a${i}`"
          class="qtune"
          type="button"
          @click="media = m"
        >
          ▶ {{ m.label ?? t('reader.listenHizb') }}
        </button>
        <button
          v-for="(m, i) in video"
          :key="`v${i}`"
          class="qtune"
          type="button"
          @click="media = m"
        >
          ▶ {{ m.label ?? t('reader.watch') }}
        </button>
      </div>

      <EmptyState v-if="work.verses.length === 0" :message="t('reader.empty')" />

      <ManuscriptBook
        v-else-if="view === 'book'"
        ref="bookRef"
        :work="work"
        :locale="locale"
        @continue="work.next && goTo(work.next.slug)"
      />

      <section v-else class="verses">
        <VerseCard
          v-for="(verse, i) in work.verses"
          :key="verse.id"
          :verse="verse"
          :number="i + 1"
          :annotations="work.annotations"
          :locale="locale"
          :latin-script="latinScript"
          :show-transliteration="reader.showTransliteration"
          :show-translation="reader.showTranslation"
        />
      </section>
    </template>
  </main>

  <button
    v-if="reader.immersive"
    class="leave-immersive"
    type="button"
    :aria-label="t('reader.leaveImmersive')"
    @click="reader.leaveImmersive()"
  >
    ✕
  </button>

  <AutoScrollBar v-if="showAutoScroll" />
  <MediaDock :item="media" @close="media = null" />
  <GlossBubble />
</template>

<style scoped>
.bar {
  position: sticky;
  top: 0;
  z-index: var(--z-nav);
}

.reader {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-2xl) var(--space-xl)
    calc(env(safe-area-inset-bottom, 0px) + var(--space-4xl));
}

.reader-head {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.cartouche {
  font-family: var(--font-arabic);
  font-size: var(--text-base);
  letter-spacing: var(--tracking-none);
  color: var(--accent);
  margin-bottom: var(--space-xs);
}

.title-ar {
  font-family: var(--font-arabic);
  font-size: var(--text-2xl);
  line-height: var(--leading-arabic-title);
  letter-spacing: var(--tracking-none);
  color: var(--ink-accent);
  font-weight: 400;
}

.title-latin {
  font-family: var(--font-serif);
  font-size: var(--text-base);
  color: var(--ink-soft);
  margin-top: var(--space-2xs);
}

/* Kein Fehler, sondern eine Auskunft: die Übersetzung liegt in einer anderen
   Sprache vor als gewünscht. Wer das nicht sagt, lässt jemanden rätseln,
   warum die App auf Deutsch steht und der Text englisch ist. */
.reader-fallback {
  text-align: center;
  font-size: var(--text-sm);
  color: var(--ink-soft);
  margin-bottom: var(--space-xl);
}

.reader-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-2xl);
}

.reader-media {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-xl);
}

/* Der Hörknopf der Vorlage (.qtune): volle Breite, Goldrand, grüner Text. */
.qtune {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  width: 100%;
  background: var(--surface-card);
  border: 1.5px solid var(--accent);
  color: var(--ink-accent);
  border-radius: var(--radius-pill);
  padding: var(--space-md) var(--space-xl);
  font-weight: 700;
  font-size: var(--text-base);
}

.qtune:active {
  background: var(--surface-press);
}

/* Der Ausgang aus dem Vollbild. Fest am Bildschirm, nicht am Blatt: wer weit
   unten steht, findet ihn sonst nicht. */
.leave-immersive {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + var(--space-md));
  inset-inline-end: var(--space-lg);
  z-index: var(--z-banner);
  width: 2.4rem;
  height: 2.4rem;
  border-radius: var(--radius-circle);
  border: 1px solid var(--accent);
  background: var(--surface-card);
  color: var(--ink-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
}
</style>
