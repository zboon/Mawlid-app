<script setup lang="ts">
import { computed } from 'vue'
import type { Annotation, Verse } from '@mawalid/shared'
import { PAGE_BREAK, splitBasmala } from '@/lib/text'
import VerseText from './VerseText.vue'

const props = defineProps<{
  verse: Verse
  number: number
  annotations: readonly Annotation[]
  locale: string
  latinScript: boolean
  showTransliteration: boolean
  showTranslation: boolean
}>()

const original = computed(() => (props.verse.texts.original?.body ?? '').split(PAGE_BREAK).join(''))
const parts = computed(() => (props.latinScript ? null : splitBasmala(original.value)))

/* Bei einer Rubrik bleibt die Umschrift aus — sie ist eine Anweisung des
   Buches, kein Gebet, das man mitspricht. */
const withTransliteration = computed(
  () => props.showTransliteration && props.verse.kind !== 'instruction',
)
</script>

<template>
  <article
    class="verse"
    :class="{ refrain: verse.kind === 'refrain', instruction: verse.kind === 'instruction' }"
  >
    <div class="v-num">{{ number }}</div>

    <p v-if="verse.kind === 'refrain'" class="v-label">Refrain · يُرَدَّد</p>
    <p v-else-if="verse.kind === 'instruction'" class="v-label">Instruction · إِرْشَاد</p>

    <p v-if="verse.noteLabel" class="v-note">{{ verse.noteLabel }}</p>
    <!-- verse.bandLabel wird hier bewusst NICHT gesetzt: das Teilerband ist
         Mobiliar der Buchansicht. Die Lesefassung der Vorlage zeigt es nicht. -->

    <template v-if="latinScript">
      <!-- Türkische Ilahis: der Originaltext ist lateinisch und wird als
           solcher gesetzt, nicht als arabischer Text mit falscher Schrift. -->
      <p class="v-latin">
        <VerseText :body="original" :rosettes="false" :id-key="`v${verse.id}`" />
      </p>
    </template>

    <template v-else-if="parts">
      <p v-if="parts.pre" class="v-ar" lang="ar" dir="rtl">
        <VerseText
          :body="parts.pre"
          :annotations="annotations"
          :locale="locale"
          :id-key="`v${verse.id}p`"
        />
      </p>
      <p class="v-ar v-basmala" lang="ar" dir="rtl">
        <VerseText
          :body="parts.basmala"
          :annotations="annotations"
          :locale="locale"
          :id-key="`v${verse.id}b`"
        />
      </p>
      <p v-if="parts.rest" class="v-ar" lang="ar" dir="rtl">
        <VerseText
          :body="parts.rest"
          :annotations="annotations"
          :locale="locale"
          :id-key="`v${verse.id}r`"
        />
      </p>
    </template>

    <p v-else class="v-ar" lang="ar" dir="rtl">
      <VerseText
        :body="original"
        :annotations="annotations"
        :locale="locale"
        :id-key="`v${verse.id}`"
      />
      <span v-if="verse.separator" class="v-salawat">{{ verse.separator }}</span>
    </p>

    <p v-if="withTransliteration && verse.texts.transliteration" class="v-tr">
      <VerseText
        :body="verse.texts.transliteration.body"
        :rosettes="false"
        :id-key="`v${verse.id}t`"
      />
    </p>

    <p
      v-if="showTranslation && verse.texts.translation"
      class="v-en"
      :lang="verse.texts.translation.lang"
    >
      <VerseText :body="verse.texts.translation.body" :rosettes="false" :id-key="`v${verse.id}e`" />
    </p>
  </article>
</template>

<style scoped>
.verse {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: var(--space-2xl) var(--space-xl) var(--space-xl);
  margin-bottom: var(--space-xl);
  position: relative;
  box-shadow: var(--shadow-xs);
}

.verse.refrain {
  border-color: var(--accent-soft);
  background: linear-gradient(var(--surface-card), var(--surface-card-alt));
}

/* Eine Rubrik aus dem Buch — kein Gebet, sondern ein Übergangshinweis. Gold
   gerahmt und blass lasiert, damit das Auge sie nicht als Teil der Bittgebete
   ringsum liest.

   In der alten App griff diese Regel NICHT: über ihr stand ein verwaister
   Deklarationsblock (index.html:889), dessen Zeilen der CSS-Parser in den
   folgenden Selektor zog und den ganzen Block damit ungültig machte. Der
   Fehler ist in Phase 0 behoben; hier kann er nicht wiederkehren, weil jede
   Regel in ihrer eigenen Komponente steht. */
.verse.instruction {
  border-color: var(--accent);
  border-width: 1.5px;
  background-image: linear-gradient(var(--accent-line-soft), transparent);
}

.v-num {
  position: absolute;
  top: -0.85rem;
  left: 50%;
  transform: translateX(-50%);
  /* Die Seitenfläche, nicht die Kartenfläche: dadurch stanzt das Medaillon
     ein Loch in den Rahmen, statt darauf zu liegen. */
  background: var(--surface-page);
  border: 1.5px solid var(--accent);
  color: var(--accent);
  width: 1.9rem;
  height: 1.9rem;
  border-radius: var(--radius-circle);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-arabic);
  font-size: var(--text-base);
  letter-spacing: var(--tracking-none);
}

.v-label {
  text-align: center;
  font-size: var(--text-sm);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 700;
  margin: var(--space-2xs) 0 var(--space-xl);
}

.v-note {
  font-family: var(--font-serif);
  font-size: var(--text-sm);
  letter-spacing: 0.03em;
  color: var(--ink-accent);
  opacity: 0.9;
  margin-bottom: var(--space-xs);
  text-align: center;
}

.v-ar {
  font-family: var(--font-arabic);
  font-size: var(--ar-size);
  line-height: var(--leading-arabic-verse);
  letter-spacing: var(--tracking-none);
  direction: rtl;
  text-align: center;
  color: var(--ink-arabic);
  margin-top: var(--space-xs);
}

.instruction .v-ar {
  color: var(--accent);
}

.v-basmala {
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--accent-line);
  margin-bottom: var(--space-sm);
}

.v-latin {
  font-family: var(--font-serif);
  font-size: calc(1.5rem * var(--latin-scale));
  color: var(--ink-arabic);
  text-align: center;
  line-height: 1.7;
  margin-top: var(--space-xs);
  font-weight: 600;
}

.v-tr {
  font-size: calc(1.02rem * var(--latin-scale));
  font-style: italic;
  color: var(--ink);
  text-align: center;
  margin-top: var(--space-md);
  line-height: 1.6;
}

.v-en {
  font-family: var(--font-serif);
  font-size: calc(1.12rem * var(--latin-scale));
  color: var(--ink-soft);
  text-align: center;
  margin-top: var(--space-sm);
  line-height: 1.55;
}

/* Die Übersetzung einer Rubrik steht in Klammern und kursiv — sie ist eine
   Erklärung, kein Gebetstext. */
.instruction .v-en {
  font-style: italic;
}

.instruction .v-en::before {
  content: '(';
}

.instruction .v-en::after {
  content: ')';
}

/* Das ﷺ ist ein Schriftzeichen, kein Ornament — es behält seine Tinte. */
.v-salawat {
  color: var(--ink-arabic);
  padding-inline-start: 0.14em;
}
</style>
