<script setup lang="ts">
defineProps<{ titleArabic: string; titleLatin: string; count?: string | null }>()
</script>

<template>
  <button class="home-tile" type="button">
    <span class="t-ar" lang="ar" dir="rtl">{{ titleArabic }}</span>
    <span class="t-latin">{{ titleLatin }}</span>
    <span v-if="count" class="t-count">{{ count }}</span>
  </button>
</template>

<style scoped>
/* Drei Textzeilen, kein Icon, keine Beschreibung. Die Beschreibung erscheint
   erst auf der Seite des Bereichs selbst — so bleibt die Startseite ruhig. */
.home-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3xs);
  text-align: center;
  padding: var(--space-lg) var(--space-sm);
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  transition:
    transform var(--duration-tap) var(--ease),
    border-color var(--duration-fast) var(--ease);
}

.home-tile:active {
  transform: scale(0.98);
}

.t-ar {
  font-family: var(--font-arabic);
  font-size: var(--text-lg);
  line-height: 1.75;
  letter-spacing: var(--tracking-none);
  color: var(--ink-accent);
}

.t-latin {
  font-weight: 700;
  font-size: var(--text-md);
  line-height: var(--leading-tight);
  color: var(--ink);
}

.t-count {
  font-size: var(--text-2xs);
  color: var(--accent);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-top: var(--space-3xs);
  line-height: var(--leading-tight);
}

@media (hover: hover) {
  .home-tile:hover {
    border-color: var(--accent-soft);
  }
}
</style>
