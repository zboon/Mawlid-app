<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import IconRosette from './icons/IconRosette.vue'

/* Der Platzhalter eines Bereichs im Aufbau — Rosette, Name, ein Satz.
   Wortgleich mit placeholder() des Zayd-Entwurfs. */
defineProps<{ title: string }>()
const { t } = useI18n()
</script>

<template>
  <div class="placeholder">
    <IconRosette class="star" />
    <p>
      <strong>{{ title }}</strong>
    </p>
    <p>{{ t('index.placeholder') }}</p>
  </div>
</template>

<style scoped>
.placeholder {
  text-align: center;
  color: var(--ink-soft);
  padding: var(--space-3xl) var(--space-2xl);
  line-height: var(--leading-body);
}

.star {
  width: 2.4rem;
  height: 2.4rem;
  margin-bottom: var(--space-md);
}

strong {
  color: var(--brand);
  font-size: var(--text-lg);
}

p {
  margin: var(--space-sm) 0;
}
</style>
