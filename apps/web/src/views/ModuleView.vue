<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import { MODULES } from '@/data/modules'

const route = useRoute()
const { t } = useI18n()
const mod = computed(() => MODULES.find((m) => m.slug === route.params.module))
</script>

<template>
  <main id="main" class="index">
    <template v-if="mod">
      <h1 class="title-ar" lang="ar" dir="rtl">{{ mod.title.ar }}</h1>
      <p class="intro">{{ mod.description }}</p>

      <!-- Phase 1 hat noch keine Inhalte: hier steht der Ladezustand, den es
           in der alten App nicht gab und ab Phase 3 bei jedem Öffnen gibt. -->
      <SkeletonCard v-for="n in 3" :key="n" />
      <EmptyState :message="t('empty.comingFromDb')" />
    </template>

    <EmptyState v-else :message="t('empty.module')" />
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

.intro {
  max-width: 640px;
  margin: 0 auto var(--space-2xl);
  padding: var(--space-2xs) var(--space-xl) 0;
  font-family: var(--font-serif);
  font-size: 0.92rem;
  line-height: var(--leading-body);
  color: var(--ink-soft);
  text-align: center;
}
</style>
