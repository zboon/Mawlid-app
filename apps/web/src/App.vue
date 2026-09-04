<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppMasthead from '@/components/AppMasthead.vue'
import TabBar from '@/components/TabBar.vue'
import type { Tab } from '@/components/TabBar.types'
import { useModules } from '@/api/queries'
import { arabic, latin } from '@/lib/localized'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const isHome = computed(() => route.name === 'home')

/* Der Leser bringt seine eigene Leiste mit — sie kann mehr (Ansichtstausch,
   Schlank-Modus) und muss sich beim Scrollen anders verhalten. Zwei Leisten
   übereinander wären beides zu viel. */
const isReader = computed(() => route.name === 'work')

/* Die Modulleiste steht auf jeder Index-Seite unter dem Kopf — wie die Tabs
   der Vorlage. Auf der Startseite nicht (dort ist das Raster die Wahl), im
   Leser nicht (dort führt „Zurück"). */
const modules = useModules()
const showTabs = computed(() => !isHome.value && !isReader.value && route.name !== 'not-found')
const tabs = computed<Tab[]>(() =>
  (modules.data.value?.modules ?? []).map((m) => ({
    slug: m.slug,
    latin: latin(m.titles, locale.value),
    arabic: arabic(m.titles),
  })),
)
const activeModule = computed(() => String(route.params.module ?? ''))

/* Auf der Startseite darf der große Kopf wegscrollen; jede andere Seite pinnt
   die kompakte Leiste. Das ist die einzige Aufgabe von html.is-home. */
watchEffect(() => {
  document.documentElement.classList.toggle('is-home', isHome.value)
})
</script>

<template>
  <a class="skip-link" href="#main">{{ t('nav.skipToContent') }}</a>

  <div v-if="!isReader" class="topbar">
    <AppMasthead :variant="isHome ? 'large' : 'compact'" />
    <TabBar
      v-if="showTabs && tabs.length"
      :tabs="tabs"
      :active="activeModule"
      @select="router.push(`/m/${$event}`)"
    />
  </div>

  <RouterView />
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: var(--z-nav);
}
</style>
