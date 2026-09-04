<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useTheme } from '@/stores/theme'
import { useReader } from '@/stores/reader'
import IconButton from './IconButton.vue'
import IconSun from './icons/IconSun.vue'
import IconMoon from './icons/IconMoon.vue'

/* Die Leiste des Lesers, wie in der Vorlage: links „‹ Zurück" als
   Textknopf, mittig die Bismillah, rechts Thema und — nur im Schlank-Modus —
   der kleine Ansichtstausch. Solange die Leiste voll ist, steht der
   beschriftete Umschalter gleich darunter in den Chips; zwei Umschalter für
   dieselbe Sache gleichzeitig wären verwirrend. */
defineProps<{ slim: boolean; hasFolios: boolean }>()

const router = useRouter()
const theme = useTheme()
const reader = useReader()
const { t } = useI18n()
</script>

<template>
  <div class="reader-bar" :class="{ slim }">
    <div class="side">
      <button class="back" type="button" @click="router.back()">‹ {{ t('nav.back') }}</button>
    </div>

    <!-- Klappt im Schlank-Modus auf Breite null, statt zu verschwinden: eine
         Breitenänderung lässt sich weich schalten, display:none nicht. -->
    <img class="bismillah" src="/img/header-bismillah.png" alt="" aria-hidden="true" />

    <div class="side end">
      <IconButton
        :label="theme.dark ? t('theme.toLight') : t('theme.toDark')"
        @click="theme.toggle()"
      >
        <IconSun v-if="theme.dark" />
        <IconMoon v-else />
      </IconButton>

      <button
        v-if="slim && hasFolios"
        class="view-swap"
        type="button"
        :aria-label="t('reader.viewSwitch')"
        @click="reader.setView(reader.view === 'book' ? 'study' : 'book')"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
        </svg>
        <span>{{ reader.view === 'book' ? t('reader.study') : t('reader.book') }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Drei gleich breite Slots — dadurch sitzt die Bismillah auf der ECHTEN Mitte
   der Leiste und nicht auf der Mitte zwischen zwei ungleich breiten
   Tastengruppen. */
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

.back {
  font-size: var(--text-lg);
  font-weight: 700;
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-xs);
  background: var(--on-brand-fill);
  white-space: nowrap;
}

.back:active {
  background: var(--on-brand-fill-active);
}

.view-swap {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  background: var(--on-brand-fill);
  color: var(--brand-on);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-xs);
  font-family: var(--font-serif);
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.view-swap svg {
  width: 1rem;
  height: 1rem;
}

.view-swap:active {
  transform: scale(0.9);
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
</style>
