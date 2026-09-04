<script setup lang="ts">
import { computed } from 'vue'
import type { Annotation } from '@mawalid/shared'
import { tokenize } from '@/lib/text'
import { useGlossBubble } from '@/composables/useGlossBubble'
import IconRosette from './icons/IconRosette.vue'

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
  }>(),
  {
    annotations: () => [],
    locale: 'de',
    stripPageBreak: true,
    rosettes: true,
    idKey: '',
  },
)

const { show } = useGlossBubble()

const tokens = computed(() =>
  tokenize(props.body, {
    annotations: props.annotations,
    locale: props.locale,
    stripPageBreak: props.stripPageBreak,
    rosettes: props.rosettes,
  }),
)
</script>

<template>
  <!-- Kein v-html. Der Text kommt aus der Datenbank und wird später redaktionell
       bearbeitet; Marken statt Zeichenketten heißt, dass eingefügtes Markup
       Text bleibt. -->
  <template v-for="(token, i) in tokens" :key="i">
    <span v-if="token.t === 'text'">{{ token.s }}</span>
    <IconRosette v-else-if="token.t === 'rosette'" />
    <br v-else-if="token.t === 'break'" />
    <button
      v-else-if="token.gloss"
      class="gloss tappable"
      type="button"
      @click="show($event, token.gloss, `${idKey}-${i}`)"
    >
      {{ token.s }}
    </button>
    <span v-else class="gloss">{{ token.s }}</span>
  </template>
</template>

<style scoped>
/* Die goldene Tinte des gedruckten Buches: Wiederholungszahlen, „der Ort des
   Aufstehens", der eigene Name zum Einsetzen. */
.gloss {
  color: var(--accent);
  font: inherit;
  letter-spacing: inherit;
}

.tappable {
  padding: 0;
  border-radius: var(--radius-mark);
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 0.25em;
}

.tappable:active {
  background: var(--accent-wash);
}
</style>
