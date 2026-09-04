<script setup lang="ts">
/* Die Rückwärts-Zeile über einer Liste: „‹ Mawlid" — zentriert, grün, ruhig.
   Wortgleich mit .back-link der Vorlage. */
defineProps<{ label: string }>()
defineEmits<{ back: [] }>()
</script>

<template>
  <button class="back-link" type="button" @click="$emit('back')">‹ {{ label }}</button>
</template>

<style scoped>
.back-link {
  display: block;
  margin: var(--space-3xs) auto var(--space-sm);
  padding: var(--space-2xs) var(--space-md);
  font-family: var(--font-serif);
  font-size: var(--text-base);
  color: var(--ink-accent);
}
</style>
