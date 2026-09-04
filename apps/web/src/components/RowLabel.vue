<script setup lang="ts">
/* Die zweisprachige Zeile über einer Gruppe: gesperrte Kapitälchen links,
   Arabisch daneben. Auf Arabisch NIEMALS letter-spacing — es bricht die
   Ligaturen. Wortgleich mit .dk-rowlab der Vorlage. */
defineProps<{ text: string; arabic?: string | null }>()
</script>

<template>
  <div class="rowlab">
    <span class="l-en">{{ text }}</span>
    <span v-if="arabic" class="l-ar" lang="ar" dir="rtl">{{ arabic }}</span>
  </div>
</template>

<style scoped>
.rowlab {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: var(--space-xs);
  margin: var(--space-lg) var(--space-3xs) var(--space-xs);
}

.l-en {
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 700;
}

.l-ar {
  font-family: var(--font-arabic);
  font-size: var(--text-lg);
  letter-spacing: var(--tracking-none);
  color: var(--accent-soft);
}
</style>
