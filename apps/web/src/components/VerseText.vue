<script setup lang="ts">
import { computed } from 'vue'
import type { Annotation } from '@mawalid/shared'
import { segmentTokens, tokenize } from '@/lib/text'
import VerseTokens from './VerseTokens.vue'

const props = withDefaults(
  defineProps<{
    body: string
    annotations?: readonly Annotation[]
    locale?: string
    stripPageBreak?: boolean
    rosettes?: boolean
    /* Ein Schlüssel, der diese Stelle im Dokument eindeutig macht — damit ein
       zweiter Tipp auf DIESELBE Glosse die Blase schließt und nicht die einer
       gleichlautenden Stelle weiter unten. */
    idKey?: string
    /* Abschnittsweise setzen: jeder Hervorhebungsabschnitt (۞/،-Zählung,
       siehe segmentTokens) bekommt eine .seg-Spanne mit data-sg. Darauf
       zeigen Treffer-Aufblitzen und Markierungen. */
    segments?: boolean
    /* Wo die Zählung beginnt — für Verse, die auf mehrere VerseText-Instanzen
       verteilt sind (Basmala-Teilung, Buchblätter). */
    segOffset?: number
    /* Abschnitte anklickbar machen: ein Tipp meldet toggleMark. In der
       Vorlage gibt es das nur auf den Dalāʾil-Blättern (segWrapMark griff
       bei kind === 'd'); wer es einschaltet, liefert auch markedSegs. */
    markable?: boolean
    markedSegs?: ReadonlySet<number>
    /* Der Abschnitt, der das Leseband trägt (die gespeicherte Stelle). */
    placedSeg?: number | null
  }>(),
  {
    annotations: () => [],
    locale: 'de',
    stripPageBreak: true,
    rosettes: true,
    idKey: '',
    segments: false,
    segOffset: 0,
    markable: false,
    markedSegs: undefined,
    placedSeg: null,
  },
)

const emit = defineEmits<{ toggleMark: [seg: number] }>()

const tokens = computed(() =>
  tokenize(props.body, {
    annotations: props.annotations,
    locale: props.locale,
    stripPageBreak: props.stripPageBreak,
    rosettes: props.rosettes,
  }),
)

const pieces = computed(() => (props.segments ? segmentTokens(tokens.value, props.segOffset) : null))
</script>

<template>
  <template v-if="pieces">
    <template v-for="(piece, i) in pieces" :key="i">
      <span
        v-if="piece.sg !== null"
        class="seg"
        :class="{
          markable,
          marked: markedSegs?.has(piece.sg),
          placed: placedSeg === piece.sg,
        }"
        :data-sg="piece.sg"
        @click="markable && emit('toggleMark', piece.sg)"
      >
        <VerseTokens :tokens="piece.tokens" :id-key="`${idKey}s${i}`" />
      </span>
      <VerseTokens v-else :tokens="piece.tokens" :id-key="`${idKey}s${i}`" />
    </template>
  </template>
  <VerseTokens v-else :tokens="tokens" :id-key="idKey" />
</template>

<style scoped>
/* Ein Abschnitt ist unsichtbares Gerüst, bis eine Markierung oder ein
   Aufblitzen ihn färbt. box-decoration-break: über Zeilenumbrüche hinweg
   bleibt die Lasur zusammenhängend. */
.seg {
  border-radius: var(--radius-mark);
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}

.seg.markable {
  cursor: pointer;
}

/* Eine gemerkte Phrase — die Studienmarkierung der Vorlage (.seg.marked). */
.seg.marked {
  background: var(--accent-wash);
}

/* DIE Stelle: das Leseband liegt auf genau einem Abschnitt, kräftiger als
   jede Markierung (.seg.placed der Vorlage). */
.seg.placed {
  background: var(--accent-wash-strong);
}

.seg.seg-flash {
  animation: seg-flash 1.5s ease-out 1;
}

@keyframes seg-flash {
  0%,
  12% {
    background: var(--accent-wash);
  }
  100% {
    background: transparent;
  }
}
</style>
