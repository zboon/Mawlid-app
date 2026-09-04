<script setup lang="ts">
defineProps<{ message: string }>()
</script>

<template>
  <!-- Kein Marketing, keine Illustration. Ein Satz, der erklärt, wie es sich
       füllt. Ein leerer Favoritenordner braucht keinen Werbetext. -->
  <p class="empty">{{ message }}</p>
</template>

<style scoped>
.empty {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-3xl) var(--space-xl);
  text-align: center;
  font-family: var(--font-serif);
  font-size: var(--text-base);
  line-height: var(--leading-body);
  color: var(--ink-soft);
}
</style>
