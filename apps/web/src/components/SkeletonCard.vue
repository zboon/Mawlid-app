<template>
  <!-- Neu gegenüber der alten App: dort lagen alle Daten im HTML, es gab
       weder Warten noch Netzfehler. Mit online-first (ADR-004) ist dieser
       Zustand kein Randfall, sondern etwas, das man bei jedem Öffnen sieht. -->
  <div class="skeleton" aria-hidden="true">
    <span class="s-num" />
    <span class="s-lines">
      <span class="s-line wide" />
      <span class="s-line" />
    </span>
  </div>
</template>

<style scoped>
.skeleton {
  display: flex;
  align-items: center;
  gap: var(--space-xl);
  width: 100%;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  margin-bottom: var(--space-lg);
}

.s-num {
  flex: none;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: var(--radius-circle);
  background: var(--surface-card-alt);
}

.s-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.s-line {
  height: 0.7rem;
  border-radius: var(--radius-mark);
  background: var(--surface-card-alt);
  width: 45%;
}

.s-line.wide {
  width: 75%;
  height: 1rem;
}

.skeleton {
  animation: pulse 1.6s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}
</style>
