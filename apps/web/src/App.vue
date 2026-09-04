<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import AppMasthead from '@/components/AppMasthead.vue'

const route = useRoute()
const { t } = useI18n()
const isHome = computed(() => route.name === 'home')

/* Der Leser bringt seine eigene Leiste mit — sie kann mehr (Ansichtstausch,
   Schlank-Modus) und muss sich beim Scrollen anders verhalten. Zwei Leisten
   übereinander wären beides zu viel. */
const isReader = computed(() => route.name === 'work')

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
