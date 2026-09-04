<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PlaceholderNote from '@/components/PlaceholderNote.vue'
import SectionIntro from '@/components/SectionIntro.vue'

/* „Mehr in Kürze" — die offene neunte Kachel des Startmenüs. Kein Bereich,
   nur das Versprechen: hier kommt noch etwas hin. */
const { t } = useI18n()
</script>

<template>
  <main id="main" class="index">
    <SectionIntro :text="t('index.moreSoonCount')" />
    <PlaceholderNote :title="t('index.moreSoon')" />
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
