<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import ContentCard from '@/components/ContentCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import SectionIntro from '@/components/SectionIntro.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import TabBar from '@/components/TabBar.vue'
import type { Tab } from '@/components/TabBar.types'
import { ApiError } from '@/api/client'
import { useCollection, useModule, useScheduleToday } from '@/api/queries'
import { arabic, latin } from '@/lib/localized'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const moduleSlug = computed(() => String(route.params.module ?? ''))
const collectionSlug = computed(() =>
  route.params.collection ? String(route.params.collection) : '',
)

const mod = useModule(moduleSlug)

/* `/m/dalail` ohne Sammlung landet auf der ersten. Ein Zwischenschritt, der
   nur eine einzige Karte zeigt, ist ein Klick ohne Inhalt. */
watch(
  () => [mod.data.value, collectionSlug.value] as const,
  ([data, current]) => {
    if (!data || current) return
    const first = data.collections[0]
    if (first) router.replace(`/m/${data.slug}/${first.slug}`)
  },
  { immediate: true },
)

const collection = useCollection(collectionSlug, moduleSlug)

const tabs = computed<Tab[]>(() =>
  (mod.data.value?.collections ?? []).map((c) => ({
    slug: c.slug,
    latin: latin(c.titles, locale.value),
    arabic: arabic(c.titles),
  })),
)

const schedule = useScheduleToday(
  collectionSlug,
  moduleSlug,
  computed(() => collection.data.value?.hasSchedule === true),
)
const hasSchedule = computed(() => (schedule.data.value?.works.length ?? 0) > 0)

const works = computed(() => collection.data.value?.works ?? [])
const isPending = computed(() => mod.isPending.value || collection.isPending.value)
const isError = computed(() => mod.isError.value || collection.isError.value)

const message = computed(() => {
  const err = mod.error.value ?? collection.error.value
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
  <TabBar
    v-if="tabs.length > 1"
    :tabs="tabs"
    :active="collectionSlug"
    @select="router.replace(`/m/${moduleSlug}/${$event}`)"
  />

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

    <template v-else-if="collection.data.value">
      <h1 v-if="arabic(collection.data.value.titles)" class="title-ar" lang="ar" dir="rtl">
        {{ arabic(collection.data.value.titles) }}
      </h1>
      <p class="title-latin">{{ latin(collection.data.value.titles, locale) }}</p>
      <SectionIntro :text="latin(collection.data.value.descriptions, locale)" />

      <!-- „Heute dran" — was in der alten App DALAIL_TODAY_IDX war. -->
      <section v-if="hasSchedule" class="today">
        <p class="today-label">
          {{ t('today.weekday', { day: t(`weekday.${schedule.data.value?.weekday ?? 0}`) }) }}
        </p>
        <ContentCard
          v-for="w in schedule.data.value?.works ?? []"
          :key="w.slug"
          :title-primary="cardTitles(w).primary"
          :title-secondary="cardTitles(w).secondary"
          :script="cardTitles(w).script"
          lead="secondary"
          :meta="t('counts.verses', { n: w.verseCount })"
          @click="openWork(w.slug)"
        />
      </section>

      <EmptyState v-if="works.length === 0" :message="t('empty.collection')" />

      <ContentCard
        v-for="w in works"
        :key="w.slug"
        :number="w.ordinal"
        :title-primary="cardTitles(w).primary"
        :title-secondary="cardTitles(w).secondary"
        :script="cardTitles(w).script"
        :lead="w.weekdays.length > 0 ? 'secondary' : 'primary'"
        :meta="w.hasAudio ? t('reader.listen') : null"
        @click="openWork(w.slug)"
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

.title-ar {
  font-family: var(--font-arabic);
  font-size: var(--text-2xl);
  line-height: var(--leading-arabic-title);
  letter-spacing: var(--tracking-none);
  color: var(--ink-accent);
  text-align: center;
  font-weight: 400;
}

.title-latin {
  font-family: var(--font-serif);
  font-size: var(--text-base);
  color: var(--ink-soft);
  text-align: center;
  margin-top: var(--space-2xs);
}

.today {
  margin: var(--space-2xl) 0;
  padding-bottom: var(--space-xl);
  border-bottom: 1px solid var(--surface-border);
}

.today-label {
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--accent);
  text-align: center;
  margin-bottom: var(--space-md);
}
</style>
