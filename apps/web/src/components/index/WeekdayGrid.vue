<script setup lang="ts">
/* Das 4-Spalten-Raster der Tagesteile. Der heutige Teil ist gefüllt.
   Wortgleich mit .dk-grid4 / .dk-bubble der Vorlage. */
import type { DayBubble } from './WeekdayGrid.types'

defineProps<{ days: DayBubble[] }>()
defineEmits<{ open: [slug: string] }>()
</script>

<template>
  <div class="grid4">
    <button
      v-for="d in days"
      :key="d.slug"
      class="bubble"
      :class="{ on: d.today }"
      type="button"
      @click="$emit('open', d.slug)"
    >
      <span class="b-en">{{ d.label }}</span>
      <span class="b-ar" lang="ar" dir="rtl">{{ d.arabic }}</span>
    </button>
  </div>
</template>

<style scoped>
.grid4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-xs);
  margin-bottom: var(--space-xs);
}

.bubble {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3xs);
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  color: var(--ink);
  border-radius: var(--radius-lg);
  padding: var(--space-sm) var(--space-xs);
  text-align: center;
  min-height: 3.3rem;
  transition: transform var(--duration-tap) var(--ease);
}

.bubble:active {
  transform: scale(0.97);
}

.b-en {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--ink);
  line-height: 1.2;
}

.b-ar {
  font-family: var(--font-arabic);
  font-size: var(--text-md);
  letter-spacing: var(--tracking-none);
  color: var(--ink-arabic);
  line-height: 1.4;
}

.bubble.on {
  background: var(--ink-accent);
  border-color: var(--ink-accent);
}

.bubble.on .b-en {
  color: var(--brand-on);
}

.bubble.on .b-ar {
  color: var(--accent-soft);
}
</style>
