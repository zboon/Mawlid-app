<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useTheme } from '@/stores/theme'
import IconButton from './IconButton.vue'
import IconHome from './icons/IconHome.vue'
import IconBack from './icons/IconBack.vue'
import IconSun from './icons/IconSun.vue'
import IconMoon from './icons/IconMoon.vue'

withDefaults(defineProps<{ variant?: 'large' | 'compact' }>(), { variant: 'large' })

const router = useRouter()
const theme = useTheme()
const { t } = useI18n()
</script>

<template>
  <header class="masthead" :class="{ compact: variant === 'compact' }">
    <!-- Kompakt ist ein Grid 1fr auto 1fr. Die beiden 1fr-Spalten sind gleich
         breit, wodurch die Bismillah auf der ECHTEN Mitte der Leiste sitzt und
         nicht auf der Mitte zwischen zwei ungleich breiten Tastengruppen. -->
    <div class="mh-left">
      <IconButton :label="t('nav.home')" @click="router.push('/')">
        <IconHome />
      </IconButton>
      <IconButton v-if="variant === 'compact'" :label="t('nav.back')" @click="router.back()">
        <IconBack />
      </IconButton>
    </div>

    <img
      v-if="variant === 'compact'"
      class="bismillah-mark"
      src="/img/header-bismillah.png"
      alt=""
      aria-hidden="true"
    />
    <!-- Das Medaillon aus osmanischer Illumination ist das Hauptlogo der
         Startseite (Zayd-Entwurf, Commit 86aff6d). Die Kalligrafie
         logo-inner.png bleibt als Asset erhalten. -->
    <img v-else class="medallion" src="/img/medallion.png" alt="Mawalid" />

    <div class="mh-right">
      <IconButton :label="t('nav.live')" variant="pill">{{ t('nav.live') }}</IconButton>
      <IconButton
        :label="theme.dark ? t('theme.toLight') : t('theme.toDark')"
        @click="theme.toggle()"
      >
        <IconSun v-if="theme.dark" />
        <IconMoon v-else />
      </IconButton>
    </div>
  </header>
</template>

<style scoped>
.masthead {
  background: var(--brand);
  color: var(--brand-on);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--space-sm);
  padding: calc(env(safe-area-inset-top, 0px) + var(--space-2xl)) var(--space-2xl) var(--space-2xl);
}

.masthead.compact {
  padding: calc(env(safe-area-inset-top, 0px) + var(--space-sm)) var(--space-md) var(--space-sm);
}

.mh-left {
  display: flex;
  gap: var(--space-xs);
  justify-self: start;
}

.mh-right {
  display: flex;
  gap: var(--space-xs);
  justify-self: end;
}

.medallion {
  /* Die mittlere Spalte ist auto-breit, ein Prozentwert hätte hier also keinen
     verlässlichen Bezug — deshalb eine feste Obergrenze plus vw für schmale
     Geräte. Maß aus dem Zayd-Entwurf (.medallion-mark: min(210px, 50%)). */
  width: min(210px, 46vw);
  height: auto;
  margin: var(--space-2xs) auto var(--space-md);
  justify-self: center;
}

.bismillah-mark {
  justify-self: center;
  max-height: 2.4rem;
  max-width: min(46vw, 12.5rem);
  width: auto;
  height: auto;
  opacity: 0.98;
}
</style>
