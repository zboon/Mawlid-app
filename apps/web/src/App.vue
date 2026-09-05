<script setup lang="ts">
import { computed, onMounted, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AppMasthead from '@/components/AppMasthead.vue'
import TabBar from '@/components/TabBar.vue'
import type { Tab } from '@/components/TabBar.types'
import { useModules } from '@/api/queries'
import { arabic, latin } from '@/lib/localized'
import { usePersonal } from '@/stores/personal'

const route = useRoute()
const router = useRouter()

/* Der eine Abgleich beim Start: persönlicher Spiegel gegen die Sicherung
   (Zone 2). Er läuft im Hintergrund; gerendert wird sofort aus dem Spiegel. */
onMounted(() => usePersonal().sync())
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
/* Nur die Menü-Bereiche — Al-Aḥzāb (in_menu = 0) hat keinen Tab, so wie es
   keine Startkachel hat. Ganz rechts die „Mehr"-Kachel als eigener Tab, wie
   im Zayd-Entwurf. */
const tabs = computed<Tab[]>(() => [
  ...(modules.data.value?.modules ?? [])
    .filter((m) => m.inMenu)
    .map((m) => ({
      slug: m.slug,
      latin: latin(m.titles, locale.value),
      arabic: arabic(m.titles),
    })),
  { slug: 'mehr', latin: t('index.moreSoon'), arabic: 'وَقَرِيبًا الْمَزِيد' },
])
const activeModule = computed(() =>
  route.name === 'more' ? 'mehr' : String(route.params.module ?? ''),
)

/* Bereichs-Theming (Zayd-Entwurf): data-theme am Wurzelelement trägt die
   Kachelfarbe des aktuellen Bereichs; tokens.css färbt darüber --brand und
   --brand-deep um, und das gesamte Chrom folgt. Grün ist die Voreinstellung
   und braucht kein Attribut. */
const sectionTheme = computed(() => {
  if (route.name === 'more') return 'neutral'
  const slug = String(route.params.module ?? '')
  if (!slug) return 'green'
  const mod = modules.data.value?.modules.find((m) => m.slug === slug)
  return mod?.theme ?? 'green'
})

watchEffect(() => {
  if (sectionTheme.value === 'green') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', sectionTheme.value)
  }
})

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
      @select="router.push($event === 'mehr' ? '/mehr' : `/m/${$event}`)"
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
