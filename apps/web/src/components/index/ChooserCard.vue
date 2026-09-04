<script setup lang="ts">
/* Die Auswahlkachel („Mawlid ad-Daybaʿī · 29 Abschnitte") — dieselbe Karte,
   die die alte Startseite benutzte (.home-card). Sie lebt weiter als die
   Sammlungswahl innerhalb eines Moduls. */
defineProps<{ titleArabic: string; titleLatin: string; count?: string | null }>()
defineEmits<{ open: [] }>()
</script>

<template>
  <button class="chooser" type="button" @click="$emit('open')">
    <span v-if="titleArabic" class="c-ar" lang="ar" dir="rtl">{{ titleArabic }}</span>
    <span class="c-en">{{ titleLatin }}</span>
    <span v-if="count" class="c-count">{{ count }}</span>
  </button>
</template>

<style scoped>
.chooser {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3xs);
  text-align: center;
  min-height: 6.4rem;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  padding: var(--space-lg) var(--space-sm);
  transition:
    transform var(--duration-tap) var(--ease),
    border-color var(--duration-fast) var(--ease);
}

.chooser:active {
  transform: scale(0.98);
}

.c-ar {
  font-family: var(--font-arabic);
  font-size: var(--text-lg);
  line-height: 1.75;
  letter-spacing: var(--tracking-none);
  color: var(--ink-accent);
}

.c-en {
  font-weight: 700;
  font-size: var(--text-md);
  line-height: var(--leading-tight);
  color: var(--ink);
}

.c-count {
  font-size: var(--text-2xs);
  color: var(--accent);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  margin-top: var(--space-2xs);
  line-height: var(--leading-tight);
}

@media (hover: hover) {
  .chooser:hover {
    border-color: var(--accent-soft);
  }
}
</style>
