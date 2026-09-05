<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PositionEntry } from '@mawalid/shared'
import IconBookmark from '@/components/icons/IconBookmark.vue'
import { toArabicDigits } from '@/lib/arabicLabels'
import { arabic, latin } from '@/lib/localized'

/* Das Band der Vorlage: „Continue where you left off" am Kopf des Index,
   mit dem arabischen Titel des Abschnitts und der Stelle (Ansicht · Vers),
   daneben ein leiser Löschknopf. Ein Band, kein Regal — gezeigt wird genau
   eine Stelle. */

const props = defineProps<{ place: PositionEntry }>()

const emit = defineEmits<{ resume: []; clear: [] }>()

const { t, locale } = useI18n()

const where = computed(() => {
  const view = t(props.place.viewMode === 'book' ? 'reader.book' : 'reader.study')
  if (props.place.position === null) return view
  return `${view} · ${t('place.verse')} ${toArabicDigits(props.place.position + 1)}`
})
</script>

<template>
  <div class="resume-wrap">
    <button class="resume-card" type="button" @click="emit('resume')">
      <span class="resume-ribbon"><IconBookmark on /></span>
      <span class="resume-text">
        <span class="resume-label">{{ t('place.continue') }}</span>
        <span class="resume-ar" lang="ar" dir="rtl">{{
          arabic(place.titles) || latin(place.titles, locale)
        }}</span>
        <span class="resume-where">{{ where }}</span>
      </span>
      <span class="chev" aria-hidden="true">›</span>
    </button>
    <button class="resume-clear" type="button" @click="emit('clear')">
      {{ t('place.clear') }}
    </button>
  </div>
</template>

<style scoped>
/* Sitzt im Index, der Breite und Seitenrand schon setzt — deshalb hier
   keine eigenen; sonst endet das Band schmaler als die Karten daneben. */
.resume-wrap {
  margin: var(--space-2xs) 0 var(--space-md);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-xs);
}

.resume-card {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  width: 100%;
  text-align: left;
  cursor: pointer;
  background: var(--surface-card);
  border: 1px solid var(--accent-soft);
  border-radius: var(--radius-lg);
  padding: var(--space-lg) var(--space-lg);
  box-shadow: var(--shadow-xs);
}

.resume-card:active {
  transform: scale(0.995);
}

.resume-ribbon {
  color: var(--accent);
  display: flex;
  flex: 0 0 auto;
}

.resume-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  min-width: 0;
  flex: 1;
}

.resume-label {
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 700;
}

.resume-ar {
  font-family: var(--font-arabic);
  font-size: var(--text-xl);
  letter-spacing: var(--tracking-none);
  direction: rtl;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resume-where {
  font-size: var(--text-md);
  color: var(--ink-soft);
}

.chev {
  color: var(--accent);
  font-size: var(--text-xl);
}

.resume-clear {
  align-self: flex-end;
  border: none;
  background: none;
  cursor: pointer;
  font: inherit;
  font-size: var(--text-sm);
  color: var(--ink-soft);
  opacity: 0.7;
  padding: var(--space-3xs) var(--space-2xs);
}

.resume-clear:active {
  opacity: 1;
}
</style>
