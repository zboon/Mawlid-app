<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import HomeTile from '@/components/HomeTile.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import ErrorState from '@/components/ErrorState.vue'
import { useModules } from '@/api/queries'
import { arabic, latin } from '@/lib/localized'
import { ApiError } from '@/api/client'

const router = useRouter()
const { t, locale } = useI18n()
const { data, isPending, isError, error, refetch } = useModules()

/* Das Startmenü nach dem Zayd-Entwurf: die Menü-Bereiche in Buchordnung, als
   neuntes die offene „Mehr in Kürze"-Kachel. Al-Aḥzāb steht nicht hier —
   es wird über die Karte am Fuß des Dalāʾil-Index erreicht (in_menu = 0). */
const modules = computed(() => (data.value?.modules ?? []).filter((m) => m.inMenu))

/* Die Zählzeile der Kachel: bei mehreren Sammlungen die Sammlungen, sonst die
   Werke — und „Demnächst" für die Bereiche, die noch im Aufbau sind. */
function count(m: { counts: { collections: number; works: number } }): string | null {
  if (m.counts.collections > 1) return t('counts.collections', { n: m.counts.collections })
  if (m.counts.works > 0) return t('counts.works', { n: m.counts.works })
  return t('index.comingSoon')
}

const message = computed(() =>
  error.value instanceof ApiError && error.value.code === 'OFFLINE'
    ? t('error.offline')
    : t('error.generic'),
)
</script>

<template>
  <main id="main" class="home">
    <ErrorState
      v-if="isError"
      :message="message"
      :retry-label="t('error.retry')"
      @retry="refetch()"
    />

    <div v-else class="home-grid">
      <template v-if="isPending">
        <SkeletonCard v-for="n in 9" :key="n" class="tile-skeleton" />
      </template>
      <template v-else>
        <HomeTile
          v-for="m in modules"
          :key="m.slug"
          :title-arabic="arabic(m.titles)"
          :title-latin="latin(m.titles, locale)"
          :count="count(m)"
          :theme="m.theme ?? 'green'"
          @click="router.push(`/m/${m.slug}`)"
        />
        <HomeTile
          :title-arabic="'وَقَرِيبًا الْمَزِيد'"
          :title-latin="t('index.moreSoon')"
          :count="t('index.moreSoonCount')"
          theme="more"
          @click="router.push('/mehr')"
        />
      </template>
    </div>

    <footer class="foot">{{ t('app.name') }}</footer>
  </main>
</template>

<style scoped>
.home-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 1fr;
  gap: var(--space-sm);
  max-width: 600px;
  margin: 0 auto;
  padding: var(--space-xl);
}

.tile-skeleton {
  margin-bottom: 0;
  height: 100%;
}

/* Unter 460 px wird das Raster zweispaltig. */
@media (max-width: 460px) {
  .home-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.foot {
  text-align: center;
  padding: var(--space-2xl) var(--space-xl)
    calc(env(safe-area-inset-bottom, 0px) + var(--space-4xl));
  font-family: var(--font-serif);
  font-size: var(--text-sm);
  color: var(--ink-soft);
}
</style>
