<script setup lang="ts">
/* Die Pille unter dem Titel. Ein Rezept, vier Varianten.
 *
 * `off` senkt nicht nur die Deckkraft, sondern wechselt auch die Farbe: auf
 * dunklem Grund war Deckkraft allein unlesbar. Und weil die Varianten
 * aufgezählte Werte sind, kann hier kein Zustand mehr ausgegeben werden, für
 * den es keine Regel gibt — in der alten App stand an einer Stelle `chip on`,
 * ohne dass `.chip.on` existierte. */
withDefaults(
  defineProps<{
    label: string
    variant?: 'toggle' | 'size' | 'icon'
    on?: boolean
    disabled?: boolean
  }>(),
  { variant: 'toggle', on: true, disabled: false },
)
</script>

<template>
  <button
    class="chip"
    :class="[variant, { off: variant === 'toggle' && !on }]"
    type="button"
    :aria-pressed="variant === 'toggle' ? on : undefined"
    :aria-label="label"
    :title="label"
    :disabled="disabled"
  >
    <slot>{{ label }}</slot>
  </button>
</template>

<style scoped>
.chip {
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: var(--pad-chip);
  border-radius: var(--radius-pill);
  border: 1.5px solid var(--accent);
  color: var(--ink-chip);
  background: transparent;
  white-space: nowrap;
  transition:
    background var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease),
    transform var(--duration-tap) var(--ease);
}

.chip.off {
  opacity: 0.85;
  border-color: var(--ink-soft);
  color: var(--ink-soft);
}

.chip.size {
  border-color: var(--surface-border);
  background: var(--surface-card);
  font-family: var(--font-arabic);
  letter-spacing: var(--tracking-none);
}

.chip.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xs) var(--space-sm);
}

.chip.icon :deep(svg) {
  width: 1rem;
  height: 1rem;
}

.chip:disabled {
  opacity: 0.35;
  cursor: default;
}

.chip:not(:disabled):active {
  transform: scale(0.97);
  background: var(--accent-wash);
}

@media (hover: hover) {
  .chip:not(:disabled):hover {
    background: var(--accent-wash);
  }
}
</style>
