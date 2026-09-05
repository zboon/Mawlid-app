<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import ContentCard from '@/components/ContentCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import RowLabel from '@/components/RowLabel.vue'
import SearchBox from '@/components/index/SearchBox.vue'
import SearchResults from '@/components/index/SearchResults.vue'
import { AR } from '@/lib/arabicLabels'
import { arabic, latin } from '@/lib/localized'
import { usePersonal } from '@/stores/personal'
import { useSearch } from '@/stores/search'

/* Die Favoritenliste: was auf diesem Gerät gemerkt wurde, in der Reihenfolge
   des Merkens — favCards() der Vorlage, erreicht über das Lesezeichen im
   Kopf (Zayd-Entwurf: favMark statt Startkachel). Gerendert wird aus dem
   lokalen Spiegel; die Einträge tragen ihre Titel selbst, damit die Seite
   ohne eine einzige Inhaltsabfrage steht. */

const router = useRouter()
const { t, locale } = useI18n()
const personal = usePersonal()
const search = useSearch()

onMounted(() => personal.sync())

const open = (f: { module: string; collection: string; work: string }) =>
  router.push(`/m/${f.module}/${f.collection}/${f.work}`)
</script>

<template>
  <main id="main" class="index">
    <SearchBox />

    <SearchResults v-if="search.active" />

    <template v-else>
      <RowLabel :text="t('fav.list')" :arabic="AR.favorites" />
      <ContentCard
        v-for="(f, i) in personal.favorites"
        :key="`${f.collection}/${f.work}`"
        :number="i + 1"
        :title-primary="arabic(f.titles) || latin(f.titles, locale)"
        :title-secondary="arabic(f.titles) ? latin(f.titles, locale) : null"
        :script="arabic(f.titles) ? 'arab' : 'latn'"
        @click="open(f)"
      />
      <EmptyState v-if="personal.favorites.length === 0" :message="t('fav.empty')" />
    </template>
  </main>
</template>

<style scoped>
.index {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--space-2xl) var(--space-xl)
    calc(env(safe-area-inset-bottom, 0px) + var(--space-4xl));
}
</style>
