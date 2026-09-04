<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import HomeTile from '@/components/HomeTile.vue'
import HomeMedallion from '@/components/HomeMedallion.vue'
import { publishedModules } from '@/data/modules'

const router = useRouter()
const { t } = useI18n()
const modules = computed(() => publishedModules())

/* Das Medaillon belegt fest die Zelle (2,2). Die Kacheln fließen mit
   grid-auto-flow:dense darum herum, statt einzeln positioniert zu werden —
   sonst müsste bei jedem neuen Bereich das CSS angefasst werden. */
</script>

<template>
  <main id="main" class="home">
    <div class="home-grid">
      <HomeTile
        v-for="m in modules"
        :key="m.slug"
        :title-arabic="m.title.ar"
        :title-latin="m.title.de"
        :count="m.count"
        @click="router.push(`/m/${m.slug}`)"
      />
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

.medallion-cell {
  grid-column: 2;
  grid-row: 2;
}

/* Unter 460 px wird das Raster zweispaltig, und das Medaillon wandert an den
   Kopf: in einem 2×N-Raster sitzt es nicht mehr „in der Mitte" und wäre dort
   sinnlos. */
@media (max-width: 460px) {
  .home-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  /* Im zweispaltigen Raster gibt es keine Mitte mehr, in der das Medaillon
     stehen könnte. Es wandert deshalb an den Kopf und behält seine Kreisform,
     statt sich über die volle Breite zu einer Ellipse zu ziehen. */
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
