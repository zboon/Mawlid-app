<script setup lang="ts">
/* Der einleitende Satz oben auf einer Bereichsseite. Die Beschreibung eines
   Bereichs steht HIER und nicht auf der Startkachel — so bleibt die
   Startseite ruhig. */
defineProps<{ text?: string | null }>()
</script>

<template>
  <p v-if="text" class="intro">{{ text }}</p>
</template>

<style scoped>
.intro {
  max-width: 640px;
  margin: 0 auto var(--space-2xl);
  padding: var(--space-2xs) var(--space-xl) 0;
  font-family: var(--font-serif);
  font-size: var(--text-base);
  line-height: var(--leading-body);
  color: var(--ink-soft);
  text-align: center;
}
</style>
