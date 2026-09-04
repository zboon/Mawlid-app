<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import EmptyState from '@/components/EmptyState.vue'

const { t } = useI18n()
</script>

<template>
  <!-- Die alte App hatte diesen Zustand nicht: renderResults() endete nach
       17 Prüfungen mit return '', eine unbekannte Kennung lieferte also eine
       leere Seite ohne jeden Hinweis. -->
  <main id="main">
    <EmptyState :message="t('empty.notFound')" />
    <p class="back">
      <RouterLink to="/">{{ t('nav.backToHome') }}</RouterLink>
    </p>
  </main>
</template>

<style scoped>
.back {
  text-align: center;
  font-family: var(--font-serif);
}
</style>
