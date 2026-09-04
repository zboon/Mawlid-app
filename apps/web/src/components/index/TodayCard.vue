<script setup lang="ts">
/* „Heute · Freitag" — die dunkelgrüne Karte mit Goldrand am Kopf jedes
   Wochenplans. Wortgleich mit .dk-today der Vorlage: Verlauf von --brand nach
   --ink-accent, 1,5 px Goldrand, Radius 16. */
defineProps<{ kicker: string; titleArabic: string; action: string }>()
defineEmits<{ open: [] }>()
</script>

<template>
  <button class="today" type="button" @click="$emit('open')">
    <span class="k">{{ kicker }}</span>
    <span class="ar" lang="ar" dir="rtl">{{ titleArabic }}</span>
    <span class="go">{{ action }}</span>
  </button>
</template>

<style scoped>
.today {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2xs);
  width: 100%;
  text-align: center;
  background: linear-gradient(160deg, var(--brand), var(--ink-accent));
  color: var(--brand-on);
  border: 1.5px solid var(--accent);
  border-radius: var(--radius-lg);
  padding: var(--pad-row-tall);
  margin-bottom: var(--space-sm);
  transition: transform var(--duration-tap) var(--ease);
}

.today:active {
  transform: scale(0.995);
}

.k {
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--accent-soft);
  font-weight: 700;
}

.ar {
  font-family: var(--font-arabic);
  font-size: var(--text-2xl);
  letter-spacing: var(--tracking-none);
  line-height: var(--leading-arabic-title);
}

.go {
  font-size: var(--text-sm);
  color: var(--accent-soft);
}
</style>
