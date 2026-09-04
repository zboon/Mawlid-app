<script setup lang="ts">
import IconChevron from './icons/IconChevron.vue'

/* Die meistbenutzte Komponente der App: eine Zeile in jeder Übersicht.
 *
 * Die Titelspalte ist ein EXPLIZITER Flex-Spaltencontainer mit min-width:0.
 * Das ist kein Detail — als reine Inline-Spans lässt eine kurze führende
 * Zeile den arabischen Titel danebenrutschen statt darunter.
 *
 * Der Chevron gehört zur Komponente. In der alten App gab eine Stelle einen
 * nackten <span class="chev"> aus, während die einzige Regel dafür
 * `.qcard .chev` hieß — der Pfeil erbte dort Textfarbe und Standardgröße
 * statt Gold in 1,2 rem. So etwas kann hier nicht mehr passieren. */
withDefaults(
  defineProps<{
    titlePrimary: string
    titleSecondary?: string | null
    number?: number | null
    lead?: 'primary' | 'secondary'
    script?: 'arab' | 'latn'
    meta?: string | null
  }>(),
  { lead: 'primary', script: 'arab', titleSecondary: null, number: null, meta: null },
)
</script>

<template>
  <button class="card" type="button">
    <span v-if="number !== null" class="num">{{ number }}</span>

    <span class="titles">
      <template v-if="lead === 'primary'">
        <span
          class="t-primary"
          :class="script"
          :lang="script === 'arab' ? 'ar' : undefined"
          :dir="script === 'arab' ? 'rtl' : undefined"
          >{{ titlePrimary }}</span
        >
        <span v-if="titleSecondary" class="t-secondary">{{ titleSecondary }}</span>
      </template>
      <template v-else>
        <span v-if="titleSecondary" class="t-lead">{{ titleSecondary }}</span>
        <span
          class="t-under"
          :class="script"
          :lang="script === 'arab' ? 'ar' : undefined"
          :dir="script === 'arab' ? 'rtl' : undefined"
          >{{ titlePrimary }}</span
        >
      </template>
      <span v-if="meta" class="t-meta">{{ meta }}</span>
    </span>

    <IconChevron class="chev" />
  </button>
</template>

<style scoped>
.card {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  width: 100%;
  text-align: start;
  padding: var(--space-lg) var(--space-xl);
  margin-bottom: var(--space-md);
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  transition: transform var(--duration-tap) var(--ease);
}

.card:active {
  transform: scale(0.985);
}

.num {
  flex: none;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: var(--radius-circle);
  border: 1px solid var(--accent);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-arabic);
  font-size: var(--text-lg);
  letter-spacing: var(--tracking-none);
}

/* Die eigentliche Spalte. Ohne min-width:0 sprengt ein langer arabischer
   Titel den Flex-Container, statt umzubrechen. */
.titles {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
}

/* `dir="rtl"` steht am Element, damit die Bidi-Reihenfolge stimmt — die
   AUSRICHTUNG folgt aber der Spalte, nicht der Schriftrichtung. Sonst stünde
   der arabische Titel rechts und der lateinische darunter links, und die Karte
   liest sich wie zwei Karten. Genau so macht es die Vorlage
   (`.qcard .t-ar { direction: rtl; text-align: left }`). */
.t-primary.arab,
.t-under.arab {
  font-family: var(--font-arabic);
  letter-spacing: var(--tracking-none);
  color: var(--ink-arabic);
  line-height: 1.4;
  text-align: left;
}

/* Wenn die Oberfläche selbst je auf Arabisch steht, dreht sich die Spalte mit. */
html[dir='rtl'] .t-primary.arab,
html[dir='rtl'] .t-under.arab {
  text-align: right;
}

.t-primary.latn,
.t-under.latn {
  font-family: var(--font-serif);
  color: var(--ink-arabic);
  font-weight: 600;
}

.t-primary {
  font-size: var(--text-xl);
}

/* Karla wie in der Vorlage — NICHT die Serifenschrift. Die Karte ist ein
   Bedienelement, keine Textseite. */
.t-secondary {
  font-size: var(--text-md);
  color: var(--ink-soft);
  line-height: var(--leading-tight);
  margin-top: var(--space-3xs);
}

/* Die lead-Variante ist der Dalāʾil-Index: dort führt der Wochentag, und der
   arabische Ḥizb-Titel steht darunter eine Stufe kleiner. */
.t-lead {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--ink);
  line-height: var(--leading-tight);
}

/* Eine Stufe kleiner als ein führender arabischer Titel — so wie in der
   Vorlage (1,35 rem gegenüber 1,2 rem). */
.t-under {
  font-size: var(--text-lg);
  margin-top: var(--space-3xs);
}

.t-meta {
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--accent);
  line-height: var(--leading-tight);
}

.chev {
  flex: none;
  width: 1.2rem;
  height: 1.2rem;
  color: var(--accent);
}

@media (hover: hover) {
  .card:hover {
    border-color: var(--accent-soft);
  }
}
</style>
