<script setup lang="ts">
import type { Annotation } from '@mawalid/shared'
import type { Leaf } from '@/lib/pages'
import VerseText from '../VerseText.vue'
import IconRosette from '../icons/IconRosette.vue'
import ManuscriptBand from './ManuscriptBand.vue'
import ManuscriptCorner from './ManuscriptCorner.vue'

const props = defineProps<{
  leaf: Leaf
  index: number
  total: number
  runningHead: string
  annotations: readonly Annotation[]
  locale: string
}>()

/* Die Basmala steht über dem Text, nicht in ihm — sie ist im Buch abgesetzt. */
const head = props.leaf.items[0]?.isBasmala ? props.leaf.items[0] : null
const body = head ? props.leaf.items.slice(1) : props.leaf.items

const closing = props.index === props.total - 1 && props.total > 1
</script>

<template>
  <div class="ms-sheet">
    <div class="ms-runhead" lang="ar" dir="rtl">{{ runningHead }}</div>

    <!-- .ms-page und .ms-text sind die Namen, die useManuscriptFit sucht.
         Wer sie umbenennt, bekommt eine Buchansicht ohne Höhenanpassung —
         und zwar ohne Fehlermeldung. -->
    <div class="ms-page" :class="{ closing, 'ms-short': leaf.short }">
      <ManuscriptBand v-if="index === 0" :label="runningHead" variant="head" />
      <ManuscriptBand v-if="leaf.band" :label="leaf.band" variant="divider" />

      <template v-if="closing">
        <div class="orn tl"><ManuscriptCorner /></div>
        <div class="orn tr"><ManuscriptCorner /></div>
        <div class="orn bl"><ManuscriptCorner /></div>
        <div class="orn br"><ManuscriptCorner /></div>
      </template>

      <div class="ms-text" lang="ar" dir="rtl">
        <div v-if="head" class="ms-basmala">
          <VerseText
            :body="head.body"
            :annotations="annotations"
            :locale="locale"
            :strip-page-break="false"
            :id-key="`ms${index}-b`"
          />
        </div>

        <template v-for="(item, i) in body" :key="`${item.verse.position}-${item.sub ?? 'x'}`">
          <ManuscriptBand v-if="item.bandBefore" :label="item.bandBefore" variant="inline" />

          <span v-if="item.verse.kind === 'instruction'" class="ms-instruction">
            <VerseText
              :body="item.body"
              :annotations="annotations"
              :locale="locale"
              :strip-page-break="false"
              :id-key="`ms${index}-${i}`"
            />
          </span>
          <span v-else class="ms-v">
            <VerseText
              :body="item.body"
              :annotations="annotations"
              :locale="locale"
              :strip-page-break="false"
              :id-key="`ms${index}-${i}`"
            />
          </span>

          <!-- Die Rosette markiert das ENDE eines Verses. Läuft der Vers auf
               das nächste Blatt weiter, steht dort keine — genau wie im Buch,
               das auch kein Zeichen setzt, wo ein Satz nur die Seite wechselt. -->
          <template v-if="!item.cont && !item.verse.noRosette">
            <span v-if="item.verse.separator" class="ms-salawat">{{ item.verse.separator }}</span>
            <IconRosette v-else />
          </template>
          {{ ' ' }}
        </template>
      </div>

      <div class="ms-folio">{{ index + 1 }}</div>
    </div>
  </div>
</template>

<style scoped>
.ms-sheet {
  flex: 0 0 100%;
  scroll-snap-align: center;
  scroll-snap-stop: always;
  max-width: 660px;
  margin: 0 auto;
  padding: 0 var(--space-md);
  display: flex;
  flex-direction: column;
}

.ms-runhead {
  text-align: center;
  font-family: var(--font-arabic);
  font-size: var(--text-sm);
  letter-spacing: var(--tracking-none);
  color: var(--ink-soft);
  opacity: 0.85;
  margin: 0 0 var(--space-xs);
}

/* Der Vierfachrahmen ist die Signatur des Designs: Papierspalt, innere
   Goldlinie, Schlagschatten — und die äußere braune Linie als border. */
.ms-page {
  background: var(--surface-card);
  color: var(--ink);
  padding: var(--space-2xl) var(--space-xl) var(--space-3xl);
  position: relative;
  border-radius: var(--radius-leaf);
  flex: 0 0 auto;
  overflow: hidden;
  border: 1.5px solid var(--surface-border);
  box-shadow: var(--shadow-leaf);
  /* Nur die Rückfalllinie, solange useManuscriptFit noch nicht gelaufen ist,
     und der Boden für ein sehr kurzes Kapitel. Die wirkliche Höhe setzt der
     Algorithmus. */
  min-height: min(72dvh, calc((100vw - 1.4rem) * 1.5));
}

.ms-text {
  font-family: var(--font-arabic);
  direction: rtl;
  text-align: center;
  letter-spacing: var(--tracking-none);
  /* Die Grundgröße. useManuscriptFit skaliert jedes Blatt um diesen Wert
     herum, damit alle Seiten eines Kapitels gleich hoch sind. */
  font-size: var(--text-3xl);
  line-height: var(--leading-arabic-ms);
}

.ms-basmala {
  display: block;
  text-align: center;
  margin: 0 0 var(--space-xl);
  padding: 0 0 var(--space-md);
  border-bottom: 1px solid var(--accent);
}

.ms-v {
  border-radius: var(--radius-xs);
  padding: 0.05em 0.12em;
}

.ms-instruction {
  color: var(--accent);
  font-size: 0.92em;
  font-style: italic;
  display: block;
  text-align: center;
  margin: var(--space-md) 0;
  padding: var(--space-sm) 0;
  border-top: 1px solid var(--surface-border);
  border-bottom: 1px solid var(--surface-border);
}

.ms-salawat {
  padding-inline: 0.14em;
}

.ms-folio {
  position: absolute;
  bottom: var(--space-md);
  inset-inline: 0;
  text-align: center;
  font-family: var(--font-arabic);
  font-size: var(--text-md);
  color: var(--ink-soft);
}

/* Die Goldstriche neben der Blattzahl — „— ١ —", wie im gedruckten Buch. */
.ms-folio::before,
.ms-folio::after {
  content: '—';
  color: var(--accent);
  padding: 0 var(--space-xs);
  opacity: 0.8;
}

.orn {
  position: absolute;
  opacity: 0.85;
}

.orn.tl {
  top: var(--space-sm);
  left: var(--space-sm);
}

.orn.tr {
  top: var(--space-sm);
  right: var(--space-sm);
  transform: scaleX(-1);
}

.orn.bl {
  bottom: var(--space-sm);
  left: var(--space-sm);
  transform: scaleY(-1);
}

.orn.br {
  bottom: var(--space-sm);
  right: var(--space-sm);
  transform: scale(-1);
}
</style>
