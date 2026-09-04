<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import BackLink from '@/components/BackLink.vue'
import ContentCard from '@/components/ContentCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import RowLabel from '@/components/RowLabel.vue'
import SectionIntro from '@/components/SectionIntro.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import ScheduleIndex from '@/components/index/ScheduleIndex.vue'
import { ApiError } from '@/api/client'
import { useCollection, useScheduleToday } from '@/api/queries'
import { AR } from '@/lib/arabicLabels'
import { arabic, latin } from '@/lib/localized'

/* Die Seite einer Sammlung: Rückwärts-Zeile zum Bereich, dann entweder die
   Kapitelliste („SELECT A CHAPTER") oder — bei den Wochenbüchern der Aḥzāb —
   der Wochenplan-Index mit dem Sammlungsnamen als Überschriftzeile. */

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const moduleSlug = computed(() => String(route.params.module ?? ''))
const collectionSlug = computed(() => String(route.params.collection ?? ''))

const collection = useCollection(collectionSlug, moduleSlug)
const detail = computed(() => collection.data.value ?? null)

const hasSchedule = computed(() => detail.value?.hasSchedule === true)
const schedule = useScheduleToday(collectionSlug, moduleSlug, hasSchedule)

const message = computed(() => {
  const err = collection.error.value
  if (err instanceof ApiError && err.code === 'OFFLINE') return t('error.offline')
  if (err instanceof ApiError && err.status === 404) return t('empty.module')
  return t('error.generic')
})

const openWork = (slug: string) =>
  router.push(`/m/${moduleSlug.value}/${collectionSlug.value}/${slug}`)

/* Ein türkisches Ilahi trägt seinen Originaltitel in lateinischer Schrift;
   ein arabischer Titel darüber wäre eine Übersetzung, die es nicht gibt. */
const cardTitles = (w: { titles: Record<string, string | undefined>; primaryScript: string }) =>
  w.primaryScript === 'latn' || !arabic(w.titles)
    ? { primary: latin(w.titles, locale.value), secondary: null, script: 'latn' as const }
    : {
        primary: arabic(w.titles),
        secondary: latin(w.titles, locale.value),
        script: 'arab' as const,
      }
</script>

<template>
  <main id="main" class="index">
    <ErrorState
      v-if="collection.isError.value"
      :message="message"
      :retry-label="t('error.retry')"
      @retry="collection.refetch()"
    />

    <template v-else-if="collection.isPending.value">
      <SkeletonCard v-for="n in 5" :key="n" />
    </template>

    <template v-else-if="detail">
      <BackLink
        :label="latin(detail.module.titles, locale)"
        @back="router.push(`/m/${moduleSlug}`)"
      />

      <!-- Wochenbuch (al-Aʿẓam, al-Istighfār): Namenszeile, Heute, Raster. -->
      <template v-if="hasSchedule">
        <RowLabel :text="latin(detail.titles, locale)" :arabic="arabic(detail.titles)" />
        <ScheduleIndex
          :works="detail.works"
          :today="schedule.data.value ?? null"
          :daily-arabic="AR.dailyAwrad"
          @open="openWork($event)"
        />
      </template>

      <!-- Kapitelliste (Burdah, Daybaʿī, Ilahis …) -->
      <template v-else>
        <SectionIntro :text="latin(detail.descriptions, locale)" />
        <RowLabel :text="t('index.chapters')" :arabic="AR.chooseChapter" />
        <ContentCard
          v-for="w in detail.works"
          :key="w.slug"
          :number="w.ordinal ?? w.sortOrder + 1"
          :title-primary="cardTitles(w).primary"
          :title-secondary="cardTitles(w).secondary"
          :script="cardTitles(w).script"
          @click="openWork(w.slug)"
        />
        <EmptyState v-if="detail.works.length === 0" :message="t('empty.collection')" />
      </template>
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
</style>
