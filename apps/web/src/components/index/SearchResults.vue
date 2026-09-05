<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { hitSnippet, type SearchHit, type SearchWorkResult } from '@mawalid/shared'
import ContentCard from '@/components/ContentCard.vue'
import ErrorState from '@/components/ErrorState.vue'
import RowLabel from '@/components/RowLabel.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import { useSearchResults } from '@/api/queries'
import { arabic, latin } from '@/lib/localized'
import { useSearch } from '@/stores/search'

/* Der Suchmodus der Vorlage: ein Begriff durchsucht die GANZE App, egal wo
   man steht. Die Treffer kommen als Werkkarten, gruppiert unter ihren
   Sammlungen; unter jeder Karte bis zu sechs Trefferzeilen mit Sprung zur
   Stelle. Die Fensterung der Schnipsel ist Darstellung und läuft hier —
   mit demselben hitSnippet, das auch dem Server zur Verfügung steht. */

const router = useRouter()
const { t, locale } = useI18n()
const search = useSearch()

const { data, isError, isPending, refetch } = useSearchResults(() => search.debounced)

/* Die Werke kommen in kanonischer Reihenfolge; aufeinanderfolgende derselben
   Sammlung bilden eine Gruppe mit einer Überschriftzeile, wie die
   Suchgruppen der Vorlage. */
type Group = { key: string; title: string; titleArabic: string | null; works: SearchWorkResult[] }
const groups = computed<Group[]>(() => {
  const out: Group[] = []
  for (const w of data.value?.works ?? []) {
    const last = out[out.length - 1]
    if (last && last.key === `${w.module}/${w.collection.slug}`) {
      last.works.push(w)
      continue
    }
    out.push({
      key: `${w.module}/${w.collection.slug}`,
      title: latin(w.collection.titles, locale.value),
      titleArabic: arabic(w.collection.titles) || null,
      works: [w],
    })
  }
  return out
})

/* Warten wird nur gezeigt, solange noch NICHTS da ist — während des Tippens
   bleibt die vorige Liste stehen (placeholderData in useSearchResults). */
const waiting = computed(() => isPending.value && search.debounced !== '')
const empty = computed(
  () => !waiting.value && !isError.value && data.value !== undefined && groups.value.length === 0,
)

const openWork = (w: SearchWorkResult) =>
  router.push(`/m/${w.module}/${w.collection.slug}/${w.work.slug}`)

const openHit = (w: SearchWorkResult, hit: SearchHit) =>
  router.push({
    path: `/m/${w.module}/${w.collection.slug}/${w.work.slug}`,
    query: { vers: String(hit.position), abschnitt: String(hit.seg) },
  })

const arSnippet = (hit: SearchHit) => hitSnippet(hit.ar, search.debounced, 120)
const secSnippet = (hit: SearchHit) => hitSnippet(hit.sec, search.debounced, 130)

const message = computed(() => {
  return isError.value && data.value === undefined
    ? t('error.generic')
    : /* Ein Fehler MIT stehender Liste: alte Treffer sind besser als eine
         Fehlerseite; der nächste Tastendruck versucht es ohnehin neu. */
      ''
})
</script>

<template>
  <div class="results">
    <ErrorState
      v-if="isError && !data"
      :message="message || t('error.generic')"
      :retry-label="t('error.retry')"
      @retry="refetch()"
    />

    <template v-else-if="waiting">
      <SkeletonCard v-for="n in 3" :key="n" />
    </template>

    <p v-else-if="empty" class="no-results">
      {{ t('search.noResults', { q: search.query }) }}
    </p>

    <template v-for="group in groups" v-else :key="group.key">
      <RowLabel :text="group.title" :arabic="group.titleArabic" />
      <template v-for="(w, i) in group.works" :key="w.work.slug">
        <ContentCard
          :number="i + 1"
          :title-primary="arabic(w.work.titles) || latin(w.work.titles, locale)"
          :title-secondary="arabic(w.work.titles) ? latin(w.work.titles, locale) : null"
          :script="arabic(w.work.titles) ? 'arab' : 'latn'"
          @click="openWork(w)"
        />
        <div v-if="w.hits.length" class="hits">
          <button
            v-for="(hit, h) in w.hits"
            :key="h"
            class="hit"
            type="button"
            @click="openHit(w, hit)"
          >
            <span class="h-ar" lang="ar" dir="rtl"
              >{{ arSnippet(hit).pre }}<mark v-if="arSnippet(hit).match">{{
                arSnippet(hit).match
              }}</mark
              >{{ arSnippet(hit).post }}</span
            >
            <span v-if="hit.sec" class="h-tr"
              >{{ secSnippet(hit).pre }}<mark v-if="secSnippet(hit).match">{{
                secSnippet(hit).match
              }}</mark
              >{{ secSnippet(hit).post }}</span
            >
          </button>
          <div v-if="w.moreHits > 0" class="hit-more">
            {{ t('search.moreHits', w.moreHits) }}
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.no-results {
  text-align: center;
  color: var(--ink-soft);
  font-size: var(--text-base);
  padding: var(--space-3xl) var(--space-xl);
  line-height: 1.5;
}

/* Die Trefferzeilen unter einer Werkkarte — eingerückt, mit Goldkante links,
   wie .hits/.hit der Vorlage. */
.hits {
  margin: calc(-1 * var(--space-sm)) 0 var(--space-md);
  padding-left: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.hit {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  width: 100%;
  text-align: right;
  background: var(--surface-card-alt);
  border: 1px solid var(--surface-border);
  border-left: 2px solid var(--accent);
  border-radius: var(--radius-xs);
  padding: var(--space-sm) var(--space-md);
  font: inherit;
  cursor: pointer;
}

.hit:active {
  transform: scale(0.99);
}

.h-ar {
  font-family: var(--font-arabic);
  font-size: var(--text-lg);
  letter-spacing: var(--tracking-none);
  color: var(--ink-arabic);
  direction: rtl;
  line-height: 1.5;
}

.h-tr {
  font-size: var(--text-xs);
  color: var(--ink-soft);
  direction: ltr;
  text-align: left;
  line-height: 1.35;
}

.hit mark {
  background: var(--accent-wash);
  color: inherit;
  border-radius: var(--radius-mark);
  padding: 0 0.08em;
}

.hit-more {
  font-size: var(--text-2xs);
  color: var(--ink-soft);
  opacity: 0.85;
  padding: var(--space-3xs) 0 var(--space-3xs) var(--space-2xs);
}
</style>
