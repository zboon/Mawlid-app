<script setup lang="ts">
/* Das illuminierte Kopfband mit seiner Kartusche.
   `head` steht am Blattkopf, `divider` in der Blattmitte (Muster auf 55 %
   Deckkraft — eine Pause, kein zweites Kopfstück), `inline` mitten im Text. */
withDefaults(defineProps<{ label: string; variant?: 'head' | 'divider' | 'inline' }>(), {
  variant: 'head',
})
</script>

<template>
  <span class="band" :class="variant">
    <svg class="art" aria-hidden="true" focusable="false">
      <rect width="100%" height="40" fill="url(#msGul)" />
      <rect width="100%" height="1.4" fill="var(--accent)" />
      <rect y="38.6" width="100%" height="1.4" fill="var(--accent)" />
    </svg>
    <span class="cartouche" lang="ar" dir="rtl">{{ label }}</span>
  </span>
</template>

<style scoped>
.band {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 2.6rem;
  /* Das Band greift optisch etwas über die Blattpolsterung hinaus. Die
     beiden negativen Werte sind exakt die Gegenstücke zweier Stufen der
     Abstandsskala, nicht freie Zahlen. */
  margin: calc(-1 * var(--space-sm)) calc(-1 * var(--space-2xs)) var(--space-xl);
  padding: var(--space-sm) 0;
}

.band.divider {
  margin-top: var(--space-2xl);
}

.band.inline {
  display: block;
  margin: var(--space-xl) 0;
}

.art {
  position: absolute;
  inset-inline: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 40px;
  width: 100%;
  display: block;
}

/* Ein Teiler in der Blattmitte ist eine Pause, kein zweites Kopfstück. */
.band.divider .art,
.band.inline .art {
  opacity: 0.55;
}

.cartouche {
  position: relative;
  z-index: 1;
  display: inline-block;
  padding: var(--space-xs) var(--space-2xl);
  background: var(--surface-card);
  color: var(--ink);
  border: 1px solid var(--accent);
  border-radius: var(--radius-pill);
  font-family: var(--font-arabic);
  font-size: var(--text-lg);
  line-height: var(--leading-arabic-title);
  letter-spacing: var(--tracking-none);
}

.band.divider .cartouche,
.band.inline .cartouche {
  font-size: var(--text-base);
}
</style>
