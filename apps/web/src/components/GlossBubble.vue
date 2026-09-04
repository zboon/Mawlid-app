<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useGlossBubble } from '@/composables/useGlossBubble'

const { bubble, hide } = useGlossBubble()

/* Ein Tipp irgendwo sonst schließt sie, Escape ebenso. */
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') hide()
}

onMounted(() => {
  document.addEventListener('click', hide)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', hide)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="bubble"
      class="bubble"
      role="status"
      :style="{ left: `${bubble.x}px`, top: `${bubble.y}px` }"
    >
      <div class="inner">{{ bubble.text }}</div>
    </div>
  </Teleport>
</template>

<style scoped>
.bubble {
  position: fixed;
  z-index: var(--z-overlay);
  transform: translate(-50%, var(--space-sm));
  max-width: min(22rem, 88vw);
  pointer-events: none;
}

.inner {
  background: var(--surface-card);
  color: var(--ink);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-sm);
  padding: var(--space-md) var(--space-lg);
  font-family: var(--font-serif);
  font-size: var(--text-base);
  line-height: var(--leading-body);
  font-style: italic;
  text-align: center;
  box-shadow: var(--shadow-xl);
}
</style>
