<script setup lang="ts">
/* Eine Zeile des Dalāʾil-Index: zweisprachige Beschriftung mittig, goldener
   Pfeil am rechten Rand. Wortgleich mit .dk-nav der Vorlage — der Pfeil ist
   absolut gesetzt, damit der Text auf der ECHTEN Mitte sitzt. */
defineProps<{ label: string; arabic?: string | null }>()
defineEmits<{ open: [] }>()
</script>

<template>
  <button class="nav" type="button" @click="$emit('open')">
    <span class="txt">
      <span class="b-en">{{ label }}</span>
      <span v-if="arabic" class="b-ar" lang="ar" dir="rtl">{{ arabic }}</span>
    </span>
    <span class="go" aria-hidden="true">›</span>
  </button>
</template>

<style scoped>
.nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  width: 100%;
  position: relative;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  color: var(--ink);
  border-radius: var(--radius-lg);
  padding: var(--pad-row);
  margin-bottom: var(--space-sm);
  text-align: center;
  transition: transform var(--duration-tap) var(--ease);
}

.nav:active {
  transform: scale(0.99);
}

.txt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3xs);
  min-width: 0;
}

.b-en {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--ink);
}

.b-ar {
  font-family: var(--font-arabic);
  font-size: var(--text-lg);
  letter-spacing: var(--tracking-none);
  color: var(--ink-arabic);
}

.go {
  position: absolute;
  inset-inline-end: var(--space-lg);
  top: 50%;
  transform: translateY(-50%);
  color: var(--accent);
  font-size: var(--text-xl);
  line-height: 1;
}
</style>
