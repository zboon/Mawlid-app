<script setup lang="ts">
import type { ThemeKey } from '@mawalid/shared'

/* Die Menükachel des Startrasters — im Zayd-Entwurf trägt jede die Farbe
   ihres Bereichs aus der osmanischen Palette; „more" ist die offene
   „Mehr in Kürze"-Kachel mit gestricheltem Goldrand auf Papiergrund. */
withDefaults(
  defineProps<{
    titleArabic: string
    titleLatin: string
    count?: string | null
    theme?: ThemeKey | 'more' | null
  }>(),
  { count: null, theme: null },
)
</script>

<template>
  <button class="home-tile" :data-tile="theme ?? undefined" type="button">
    <span class="t-ar" lang="ar" dir="rtl">{{ titleArabic }}</span>
    <span class="t-latin">{{ titleLatin }}</span>
    <span v-if="count" class="t-count">{{ count }}</span>
  </button>
</template>

<style scoped>
/* Drei Textzeilen, kein Icon, keine Beschreibung. Die Beschreibung erscheint
   erst auf der Seite des Bereichs selbst — so bleibt die Startseite ruhig. */
.home-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3xs);
  text-align: center;
  padding: var(--space-lg) var(--space-sm);
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  transition:
    transform var(--duration-tap) var(--ease),
    border-color var(--duration-fast) var(--ease);
}

.home-tile:active {
  transform: scale(0.98);
}

.t-ar {
  font-family: var(--font-arabic);
  font-size: var(--text-lg);
  line-height: 1.75;
  letter-spacing: var(--tracking-none);
  color: var(--ink-accent);
}

.t-latin {
  font-weight: 700;
  font-size: var(--text-md);
  line-height: var(--leading-tight);
  color: var(--ink);
}

.t-count {
  font-size: var(--text-2xs);
  color: var(--accent);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-top: var(--space-3xs);
  line-height: var(--leading-tight);
}

/* Die farbigen Menükacheln: Bereichsfarbe als Fläche, weicher Goldrand,
   Schrift in Elfenbein und Gold — wortgleich mit .home-card[data-tile] des
   Zayd-Entwurfs. */
.home-tile[data-tile] {
  border-color: var(--accent-soft);
}

.home-tile[data-tile] .t-ar {
  color: var(--accent-soft);
}

.home-tile[data-tile] .t-latin {
  color: var(--brand-on);
}

.home-tile[data-tile] .t-count {
  color: rgb(from var(--brand-on) r g b / 0.78);
}

.home-tile[data-tile='green'] {
  background: var(--tile-green);
}

.home-tile[data-tile='navy'] {
  background: var(--tile-navy);
}

.home-tile[data-tile='maroon'] {
  background: var(--tile-maroon);
}

.home-tile[data-tile='teal'] {
  background: var(--tile-teal);
}

.home-tile[data-tile='ochre'] {
  background: var(--tile-ochre);
}

.home-tile[data-tile='plum'] {
  background: var(--tile-plum);
}

.home-tile[data-tile='rust'] {
  background: var(--tile-rust);
}

.home-tile[data-tile='indigo'] {
  background: var(--tile-indigo);
}

/* „Mehr in Kürze": ein offener Platzhalter, kein farbiges Ziel — gestrichelter
   Goldrand auf dem gewöhnlichen Kartengrund. */
.home-tile[data-tile='more'] {
  background: var(--surface-card);
  border: 1.5px dashed var(--accent-soft);
}

.home-tile[data-tile='more'] .t-ar,
.home-tile[data-tile='more'] .t-latin {
  color: var(--ink-soft);
}

.home-tile[data-tile='more'] .t-count {
  color: var(--accent);
}

@media (hover: hover) {
  .home-tile:hover {
    border-color: var(--accent-soft);
  }
}
</style>
