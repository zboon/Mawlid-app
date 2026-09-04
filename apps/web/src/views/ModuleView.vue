<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { CollectionSummary } from '@mawalid/shared'
import BackLink from '@/components/BackLink.vue'
import ContentCard from '@/components/ContentCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import RowLabel from '@/components/RowLabel.vue'
import SectionIntro from '@/components/SectionIntro.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import ChooserCard from '@/components/index/ChooserCard.vue'
import ScheduleIndex from '@/components/index/ScheduleIndex.vue'
import { ApiError } from '@/api/client'
import { useCollection, useModule, useScheduleToday } from '@/api/queries'
import { AR } from '@/lib/arabicLabels'
import { arabic, latin } from '@/lib/localized'

/* Die Seite eines Bereichs. Drei Gestalten, wie in der Vorlage:
 *
 *  1. EINE Sammlung mit Wochenplan (Dalāʾil): der Wochenplan-Index —
 *     Heute-Karte, „Vor der Lesung", Tagesraster, Abschluss, Über-Zeile.
 *  2. MEHRERE Sammlungen (Mawlid, Nasheeds & Qasidas): die Auswahlkacheln —
 *     „CHOOSE A MAWLID", zwei Kacheln je Zeile.
 *  3. Al-Aḥzāb: die gemischte Liste — einzelne Litaneien als Karten, die
 *     beiden Wochenbücher als Zeilen mit „7 Tagesteile".
 */

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const moduleSlug = computed(() => String(route.params.module ?? ''))
const mod = useModule(moduleSlug)

const collections = computed(() => mod.data.value?.collections ?? [])
const single = computed(() => (collections.value.length === 1 ? collections.value[0] : null))

/* Die gemischte Liste: genau dann, wenn der Bereich mehrere Sammlungen hat
   und mindestens eine davon einen Wochenplan trägt (heute: Al-Aḥzāb). */
const isMixed = computed(
  () => collections.value.length > 1 && collections.value.some((c) => c.hasSchedule),
)
/* In der gemischten Liste werden die Werke der planlosen Sammlung inline
   gezeigt. Heute gibt es genau eine („einzelne"); gäbe es mehrere, würden
   sie zu Auswahlkacheln — inline wäre die Liste nicht mehr lesbar. */
const plain = computed(() => {
  const withoutSchedule = collections.value.filter((c) => !c.hasSchedule)
  return isMixed.value && withoutSchedule.length === 1 ? (withoutSchedule[0] ?? null) : null
})

const detailSlug = computed(() => single.value?.slug ?? plain.value?.slug ?? '')
const collection = useCollection(detailSlug, moduleSlug)

const hasSchedule = computed(() => single.value?.hasSchedule === true)
const schedule = useScheduleToday(detailSlug, moduleSlug, hasSchedule)

/* /m/dalail?gruppe=vor — die Unterseite „Vor der Lesung". */
const showBefore = computed(() => route.query.gruppe === 'vor')

const isPending = computed(
  () => mod.isPending.value || (detailSlug.value !== '' && collection.isPending.value),
)
const isError = computed(() => mod.isError.value || collection.isError.value)

const message = computed(() => {
  const err = mod.error.value ?? collection.error.value
  if (err instanceof ApiError && err.code === 'OFFLINE') return t('error.offline')
  if (err instanceof ApiError && err.status === 404) return t('empty.module')
  return t('error.generic')
})

const openWork = (collectionSlug: string, workSlug: string) =>
  router.push(`/m/${moduleSlug.value}/${collectionSlug}/${workSlug}`)

const openCollection = (slug: string) => router.push(`/m/${moduleSlug.value}/${slug}`)

const chooserCount = (c: CollectionSummary): string | null => {
  if (c.counts.works === 0) return t('index.comingSoon')
  if (c.counts.works === 1) return t('counts.work')
  return t('counts.works', { n: c.counts.works })
}

/* Die Beschriftungen der Auswahlzeile — Inhalt, siehe lib/arabicLabels.ts. */
const chooseArabic = computed(() =>
  moduleSlug.value === 'mawlid' ? AR.chooseMawlid : AR.chooseSection,
)

/* „Vor der Lesung": alle Werke vor dem ersten Tagesteil, ohne das Titelblatt
   (das hat seine eigene Über-Zeile im Index). */
const beforeWorks = computed(() => {
  const works = collection.data.value?.works ?? []
  const first = works.findIndex((w) => w.weekdays.length > 0)
  if (first <= 1) return []
  return works.slice(1, first)
})

/* Der Querverweis der Vorlage: Al-Aḥzāb ist ein eigenes Buch und bekommt am
   Fuß des Dalāʾil-Index eine eigene Karte unter einer Goldlinie — dort wurde
   es immer erreicht, und so fand es Befund B1 auch wieder. Ein Datenmodell
   dafür gibt es (noch) nicht; der eine Verweis steht deshalb hier, benannt. */
const AHZAB_FROM_DALAIL = { from: 'dalail', to: 'ahzab' }
const crossLink = computed(() =>
  moduleSlug.value === AHZAB_FROM_DALAIL.from
    ? mod.data.value
      ? { slug: AHZAB_FROM_DALAIL.to }
      : null
    : null,
)
const crossModule = useModule(computed(() => (crossLink.value ? AHZAB_FROM_DALAIL.to : '')))
</script>

<template>
  <main id="main" class="index">
    <ErrorState
      v-if="isError"
      :message="message"
      :retry-label="t('error.retry')"
      @retry="
        () => {
          mod.refetch()
          collection.refetch()
        }
      "
    />

    <template v-else-if="isPending">
      <SkeletonCard v-for="n in 5" :key="n" />
    </template>

    <!-- Gestalt 1a · Unterseite „Vor der Lesung" -->
    <template v-else-if="showBefore && single && collection.data.value">
      <BackLink :label="latin(mod.data.value?.titles ?? {}, locale)" @back="router.back()" />
      <RowLabel :text="t('index.before')" :arabic="AR.before" />
      <ContentCard
        v-for="w in beforeWorks"
        :key="w.slug"
        :number="w.sortOrder + 1"
        :title-primary="arabic(w.titles)"
        :title-secondary="latin(w.titles, locale)"
        lead="secondary"
        script="arab"
        @click="openWork(single.slug, w.slug)"
      />
    </template>

    <!-- Gestalt 1 · Wochenplan-Index (Dalāʾil) -->
    <template v-else-if="single && hasSchedule && collection.data.value">
      <ScheduleIndex
        :works="collection.data.value.works"
        :today="schedule.data.value ?? null"
        :daily-arabic="AR.dailyDalail"
        :about-name="latin(mod.data.value?.titles ?? {}, locale)"
        :about-arabic="arabic(mod.data.value?.titles ?? {})"
        @open="openWork(single.slug, $event)"
        @before="router.push({ path: `/m/${moduleSlug}`, query: { gruppe: 'vor' } })"
      />

      <div v-if="crossModule.data.value" class="cross">
        <ChooserCard
          class="cross-card"
          :title-arabic="arabic(crossModule.data.value.titles)"
          :title-latin="latin(crossModule.data.value.titles, locale)"
          :count="t('counts.works', { n: crossModule.data.value.counts.works })"
          @open="router.push(`/m/${AHZAB_FROM_DALAIL.to}`)"
        />
      </div>
    </template>

    <!-- Gestalt 3 · Die gemischte Liste (Al-Aḥzāb) -->
    <template v-else-if="isMixed">
      <RowLabel :text="t('index.litanies')" :arabic="AR.chooseLitany" />
      <template v-if="plain && collection.data.value">
        <ContentCard
          v-for="(w, i) in collection.data.value.works"
          :key="w.slug"
          :number="i + 1"
          :title-primary="arabic(w.titles)"
          :title-secondary="latin(w.titles, locale)"
          script="arab"
          @click="openWork(plain.slug, w.slug)"
        />
      </template>
      <ContentCard
        v-for="(c, i) in collections.filter((x) => x.hasSchedule)"
        :key="c.slug"
        :number="(plain ? (collection.data.value?.works.length ?? 0) : 0) + i + 1"
        :title-primary="arabic(c.titles)"
        :title-secondary="`${latin(c.titles, locale)} · ${t('index.dailyPortions', { n: c.counts.works })}`"
        script="arab"
        @click="openCollection(c.slug)"
      />
    </template>

    <!-- Gestalt 2 · Auswahlkacheln (Mawlid, Nasheeds & Qasidas) -->
    <template v-else-if="collections.length > 1">
      <SectionIntro :text="latin(mod.data.value?.descriptions ?? {}, locale)" />
      <RowLabel :text="t('index.choose')" :arabic="chooseArabic" />
      <div class="chooser-grid">
        <ChooserCard
          v-for="c in collections"
          :key="c.slug"
          :title-arabic="arabic(c.titles)"
          :title-latin="latin(c.titles, locale)"
          :count="chooserCount(c)"
          @open="openCollection(c.slug)"
        />
      </div>
    </template>

    <!-- Eine Sammlung ohne Wochenplan: direkt die Werkliste. -->
    <template v-else-if="single && collection.data.value">
      <SectionIntro :text="latin(collection.data.value.descriptions, locale)" />
      <RowLabel :text="t('index.chapters')" :arabic="AR.chooseChapter" />
      <ContentCard
        v-for="w in collection.data.value.works"
        :key="w.slug"
        :number="w.sortOrder + 1"
        :title-primary="arabic(w.titles) || latin(w.titles, locale)"
        :title-secondary="arabic(w.titles) ? latin(w.titles, locale) : null"
        :script="w.primaryScript === 'latn' || !arabic(w.titles) ? 'latn' : 'arab'"
        @click="openWork(single.slug, w.slug)"
      />
      <EmptyState
        v-if="collection.data.value.works.length === 0"
        :message="t('empty.collection')"
      />
    </template>
  </main>
</template>

<style scoped>
.index {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-2xl) var(--space-xl)
    calc(env(safe-area-inset-bottom, 0px) + var(--space-4xl));
}

/* Zwei Kacheln je Zeile, wie die Sammlungswahl der Vorlage. */
.chooser-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
  padding-bottom: var(--space-xl);
  border-bottom: 1px solid var(--accent-line-soft);
}

/* Al-Aḥzāb unter der Goldlinie — ein eigenes Buch, keine weitere Zeile. */
.cross {
  margin-top: var(--space-3xl);
  padding-top: var(--space-2xl);
  border-top: 1px solid var(--accent-line-soft);
}

.cross-card {
  width: 100%;
}
</style>
