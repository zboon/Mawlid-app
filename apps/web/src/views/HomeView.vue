<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import HomeTile from '@/components/HomeTile.vue'
import HomeMedallion from '@/components/HomeMedallion.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import ErrorState from '@/components/ErrorState.vue'
import { useModules } from '@/api/queries'
import { arabic, latin } from '@/lib/localized'
import { ApiError } from '@/api/client'

const router = useRouter()
const { t, locale } = useI18n()
const { data, isPending, isError, error, refetch } = useModules()

const modules = computed(() => data.value?.modules ?? [])

/* Die Zählzeile der Kachel. Sie nennt die größere Einheit: bei den Dalāʾil
   die fünfzehn Teile, beim Mawlid die vier Sammlungen. */
function count(m: { counts: { collections: number; works: number } }): string | null {
  if (m.counts.collections > 1) return t('counts.collections', { n: m.counts.collections })
  if (m.counts.works > 0) return t('counts.works', { n: m.counts.works })
  return null
}

const message = computed(() =>
  error.value instanceof ApiError && error.value.code === 'OFFLINE'
    ? t('error.offline')
    : t('error.generic'),
)

/* Das Medaillon belegt fest die Zelle (2,2). Die Kacheln fließen mit
   grid-auto-flow:dense darum herum, statt einzeln positioniert zu werden —
   sonst müsste bei jedem neuen Bereich das CSS angefasst werden. */
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
        <SkeletonCard v-for="n in 5" :key="n" class="tile-skeleton" />
      </template>
      <template v-else>
        <HomeTile
          v-for="m in modules"
          :key="m.slug"
          :title-arabic="arabic(m.titles)"
          :title-latin="latin(m.titles, locale)"
          :count="count(m)"
          @click="router.push(`/m/${m.slug}`)"
        />
      </template>
      <HomeMedallion class="medallion-cell" />
    </div>

    <footer class="foot">{{ t('app.name') }}</footer>
  </main>
</template>

<style scoped>
.home-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 1fr;
  grid-auto-flow: dense;
  gap: var(--space-sm);
  max-width: 600px;
  margin: 0 auto;
  padding: var(--space-xl);
}

.tile-skeleton {
  margin-bottom: 0;
  height: 100%;
}

.medallion-cell {
  grid-column: 2;
  grid-row: 2;
}

/* Unter 460 px wird das Raster zweispaltig, und das Medaillon wandert an den
   Kopf: in einem 2×N-Raster sitzt es nicht mehr „in der Mitte" und wäre dort
   sinnlos. Es behält seine Kreisform, statt sich über die volle Breite zu
   einer Ellipse zu ziehen. */
@media (max-width: 460px) {
  .home-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .medallion-cell {
    grid-column: 1 / -1;
    grid-row: 1;
    width: 8rem;
    margin-inline: auto;
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
