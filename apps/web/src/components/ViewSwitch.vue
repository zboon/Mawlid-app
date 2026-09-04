<script setup lang="ts">
import type { ReaderView } from '@/stores/reader'

defineProps<{ view: ReaderView; labels: { study: string; book: string }; groupLabel: string }>()
defineEmits<{ select: [view: ReaderView] }>()
</script>

<template>
  <div class="switch" role="group" :aria-label="groupLabel">
    <button
      type="button"
      :class="{ on: view === 'book' }"
      :aria-pressed="view === 'book'"
      @click="$emit('select', 'book')"
    >
      {{ labels.book }}
    </button>
    <button
      type="button"
      :class="{ on: view === 'study' }"
      :aria-pressed="view === 'study'"
      @click="$emit('select', 'study')"
    >
      {{ labels.study }}
    </button>
  </div>
</template>

<style scoped>
.switch {
  display: inline-flex;
  border: 1.5px solid var(--surface-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
  background: var(--surface-card);
}

.switch button {
  padding: var(--space-xs) var(--space-md);
  font-family: var(--font-serif);
  font-size: var(--text-sm);
  color: var(--ink-soft);
  white-space: nowrap;
  transition: background var(--duration-fast) var(--ease);
}

.switch button.on {
  background: var(--ink-accent);
  color: var(--brand-on);
}
</style>
