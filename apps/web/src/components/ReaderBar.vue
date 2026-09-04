<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useTheme } from '@/stores/theme'
import { useReader } from '@/stores/reader'
import IconButton from './IconButton.vue'
import IconBack from './icons/IconBack.vue'
import IconHome from './icons/IconHome.vue'
import IconSun from './icons/IconSun.vue'
import IconMoon from './icons/IconMoon.vue'
import ViewSwitch from './ViewSwitch.vue'

defineProps<{ slim: boolean; hasFolios: boolean }>()

const router = useRouter()
const theme = useTheme()
const reader = useReader()
const { t } = useI18n()
</script>

<template>
  <div class="reader-bar" :class="{ slim }">
    <div class="side">
      <IconButton :label="t('nav.back')" @click="router.back()">
        <IconBack />
      </IconButton>
      <IconButton :label="t('nav.home')" @click="router.push('/')">
        <IconHome />
      </IconButton>
    </div>

    <!-- Klappt im Schlank-Modus auf Breite null, statt zu verschwinden: eine
         Breitenänderung lässt sich weich schalten, display:none nicht. -->
    <img class="bismillah" src="/img/header-bismillah.png" alt="" aria-hidden="true" />

    <div class="side end">
      <!-- Der Ansichtstausch erscheint NUR im Schlank-Modus: solange die
           Leiste voll ist, steht der beschriftete Umschalter gleich darunter
           in den Chips. Zwei Umschalter für dieselbe Sache gleichzeitig wären
           verwirrend. -->
      <ViewSwitch
        v-if="slim && hasFolios"
        class="mini-switch"
        :view="reader.view"
        :labels="{ study: 'أ', book: '❑' }"
        :group-label="t('reader.viewSwitch')"
        @select="reader.setView($event)"
      />
      <IconButton
        :label="theme.dark ? t('theme.toLight') : t('theme.toDark')"
        @click="theme.toggle()"
      >
        <IconSun v-if="theme.dark" />
        <IconMoon v-else />
      </IconButton>
    </div>
  </div>
</template>

<style scoped>
/* Drei gleich breite Slots per Flexbox — dadurch sitzt die Bismillah auf der
   ECHTEN Mitte der Leiste und nicht auf der Mitte zwischen zwei ungleich
   breiten Tastengruppen. */
.reader-bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--brand);
  color: var(--brand-on);
  padding: calc(env(safe-area-inset-top, 0px) + var(--space-md)) var(--space-md) var(--space-md);
  transition: padding var(--duration-base) var(--ease);
}

.reader-bar.slim {
  padding: calc(env(safe-area-inset-top, 0px) + var(--space-xs)) var(--space-md) var(--space-xs);
}

.side {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
}

.side.end {
  justify-content: flex-end;
}

.bismillah {
  flex: 0 1 auto;
  max-height: 2.4rem;
  max-width: min(46vw, 12.5rem);
  width: auto;
  height: auto;
  transition:
    max-width var(--duration-base) var(--ease),
    max-height var(--duration-base) var(--ease),
    opacity var(--duration-fast) var(--ease);
}

.reader-bar.slim .bismillah {
  max-width: 0;
  max-height: 0;
  opacity: 0;
}

.mini-switch {
  border-color: var(--on-brand-fill);
  background: var(--on-brand-fill-subtle);
}
</style>
