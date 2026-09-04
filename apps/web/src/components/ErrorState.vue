<script setup lang="ts">
/* Neu gegenüber der alten App: dort lagen alle Daten im HTML, es gab keinen
   Netzfehler. Mit online-first (ADR-004) ist das ein Zustand, den man sehen
   wird — also bekommt er einen Satz, der sagt, was los ist, und einen Knopf,
   der etwas tut. Keine Entschuldigung, kein Stapelabzug. */
defineProps<{ message: string; retryLabel?: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="error" role="alert">
    <p class="msg">{{ message }}</p>
    <button v-if="retryLabel" class="retry" type="button" @click="$emit('retry')">
      {{ retryLabel }}
    </button>
  </div>
</template>

<style scoped>
.error {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-3xl) var(--space-xl);
  text-align: center;
}

.msg {
  font-family: var(--font-serif);
  font-size: var(--text-base);
  line-height: var(--leading-body);
  color: var(--ink-soft);
}

.retry {
  margin-top: var(--space-xl);
  padding: var(--space-sm) var(--space-2xl);
  border: 1.5px solid var(--accent);
  border-radius: var(--radius-pill);
  color: var(--ink-chip);
  font-weight: 700;
  font-size: var(--text-sm);
  letter-spacing: var(--tracking-wide);
}

.retry:active {
  transform: scale(0.985);
}

@media (hover: hover) {
  .retry:hover {
    background: var(--accent-wash);
  }
}
</style>
