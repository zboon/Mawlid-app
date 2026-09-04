<script setup lang="ts">
/* Der runde Knopf, der in jeder Kopfleiste sitzt. Ein Rezept für alle
   Varianten der alten App, die dasselbe fünfmal einzeln definiert hatte. */
withDefaults(defineProps<{ label: string; variant?: 'circle' | 'pill'; active?: boolean }>(), {
  variant: 'circle',
  active: false,
})
</script>

<template>
  <button
    class="icon-btn"
    :class="[variant, { active }]"
    :aria-label="label"
    :title="label"
    type="button"
  >
    <slot />
  </button>
</template>

<style scoped>
.icon-btn {
  height: 2.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--on-brand-fill);
  color: var(--brand-on);
  position: relative;
  transition: background var(--duration-fast) var(--ease);
}

.circle {
  width: 2.3rem;
  border-radius: var(--radius-circle);
}

.pill {
  padding: 0 var(--space-md);
  border-radius: var(--radius-pill);
  font-family: var(--font-serif);
  font-size: 0.84rem;
  letter-spacing: var(--tracking-wide);
  line-height: 1;
  white-space: nowrap;
}

/* Sichtbar bleiben 2,3 rem ≈ 37 px; das Tippziel wächst unsichtbar auf 44 px,
   ohne dass sich am Aussehen etwas ändert. */
.icon-btn::after {
  content: '';
  position: absolute;
  inset: -4px;
}

.icon-btn:active {
  background: var(--on-brand-fill-active);
}

.icon-btn.active {
  background: var(--accent);
  color: var(--brand);
}

.icon-btn :deep(svg) {
  width: 1.3rem;
  height: 1.3rem;
  display: block;
}
</style>
