<script setup lang="ts">
import { useAutoScroll } from '@/composables/useAutoScroll'

const scroll = useAutoScroll()
</script>

<template>
  <div class="autoscroll-bar" role="group" aria-label="Autoscroll">
    <button
      class="play"
      type="button"
      :aria-label="scroll.running.value ? 'Autoscroll anhalten' : 'Autoscroll starten'"
      @click="scroll.toggle()"
    >
      {{ scroll.running.value ? '❙❙' : '▶' }}
    </button>
    <button type="button" aria-label="Langsamer" @click="scroll.slower()">−</button>
    <span class="spd">{{ scroll.label() }}</span>
    <button type="button" aria-label="Schneller" @click="scroll.faster()">+</button>
    <span class="lbl">Scroll</span>
  </div>
</template>

<style scoped>
.autoscroll-bar {
  position: fixed;
  inset-inline: 0;
  bottom: calc(env(safe-area-inset-bottom, 0px) + var(--player-h) + var(--space-xl));
  z-index: var(--z-dock);
  width: max-content;
  margin-inline: auto;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-lg);
  border-radius: var(--radius-pill);
  background: var(--brand);
  color: var(--brand-on);
  box-shadow: var(--shadow-lg);
}

.autoscroll-bar button {
  width: 1.9rem;
  height: 1.9rem;
  border-radius: var(--radius-circle);
  background: var(--on-brand-fill);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  line-height: 1;
}

.autoscroll-bar button:active {
  background: var(--on-brand-fill-active);
}

.spd {
  font-family: var(--font-serif);
  font-size: var(--text-sm);
  min-width: 2.2rem;
  text-align: center;
}

.lbl {
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  opacity: 0.75;
}
</style>
