<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ScheduleToday, WorkSummary } from '@mawalid/shared'
import { AR } from '@/lib/arabicLabels'
import { arabicWeekday, dayBubbles, partitionScheduleWorks } from '@/lib/scheduleIndex'
import { arabic, latin } from '@/lib/localized'
import RowLabel from '@/components/RowLabel.vue'
import NavRow from './NavRow.vue'
import TodayCard from './TodayCard.vue'
import type { DayBubble } from './WeekdayGrid.types'
import WeekdayGrid from './WeekdayGrid.vue'

/* Der Wochenplan-Index: Heute-Karte, „Vor der Lesung", das Tagesraster,
   Abschluss- und Über-Zeile. Die Möbel aus dem Dalāʾil-Index der Vorlage,
   getrieben von der Sammlung statt von Array-Indizes. */
const props = defineProps<{
  works: WorkSummary[]
  today: ScheduleToday | null
  /* الْأَحْزَابُ الْيَوْمِيَّةُ bei den Dalāʾil, الْأَوْرَادُ الْيَوْمِيَّةُ bei den Aḥzāb. */
  dailyArabic: string
  /* Name für die „Über …"-Zeile (das Titelblatt-Werk). Leer = keine Zeile. */
  aboutName?: string
  aboutArabic?: string | null
}>()

const emit = defineEmits<{ open: [slug: string]; before: [] }>()

const { t, locale } = useI18n()

const parts = computed(() => partitionScheduleWorks(props.works))

/* „Vor der Lesung" ohne das Titelblatt — das bekommt seine eigene Zeile
   („Über Dalāʾil al-Khayrāt"), wie in der Vorlage. */
const beforeGroup = computed(() =>
  parts.value.before.length > 1 ? parts.value.before.slice(1) : parts.value.before,
)
const aboutWork = computed(() => (parts.value.before.length > 1 ? parts.value.before[0] : null))

const todayWork = computed(() => props.today?.works[0] ?? null)
const todayWeekday = computed(() => props.today?.weekday ?? new Date().getDay())

const bubbles = computed<DayBubble[]>(() =>
  dayBubbles(parts.value.grid).map((b) => ({
    slug: b.slug,
    label:
      b.weekday === null
        ? ''
        : b.part > 1
          ? `${t(`weekdayShort.${b.weekday}`)} ²`
          : t(`weekdayShort.${b.weekday}`),
    arabic: arabicWeekday(b.weekday, b.part),
    /* Teil 2 ist nie „heute" — der Wochenzeiger der Vorlage zeigt auf Teil 1. */
    today: b.part === 1 && b.weekday === todayWeekday.value,
  })),
)
</script>

<template>
  <TodayCard
    v-if="todayWork"
    :kicker="t('index.today', { day: t(`weekday.${todayWeekday}`) })"
    :title-arabic="arabic(todayWork.titles)"
    :action="t('index.openPortion')"
    @open="emit('open', todayWork.slug)"
  />

  <!-- Das Band der Vorlage folgt direkt auf die Heute-Karte
       (renderIndex: todayCard + resumeCard()). -->
  <slot name="resume" />

  <NavRow
    v-if="beforeGroup.length"
    :label="t('index.before')"
    :arabic="AR.before"
    @open="emit('before')"
  />

  <RowLabel :text="t('index.daily')" :arabic="dailyArabic" />
  <WeekdayGrid :days="bubbles" @open="emit('open', $event)" />

  <template v-if="parts.after.length || aboutWork">
    <div class="sep" />

    <!-- Genau ein Werk nach den Tagesteilen ist das Abschlussgebet und trägt
         die Zeile der Vorlage; mehrere stünden mit ihren eigenen Titeln da. -->
    <NavRow
      v-for="(w, i) in parts.after"
      :key="w.slug"
      :label="parts.after.length === 1 && i === 0 ? t('index.completion') : latin(w.titles, locale)"
      :arabic="parts.after.length === 1 && i === 0 ? AR.completion : arabic(w.titles)"
      @open="emit('open', w.slug)"
    />

    <NavRow
      v-if="aboutWork"
      :label="t('index.about', { name: aboutName ?? latin(aboutWork.titles, locale) })"
      :arabic="aboutArabic ?? arabic(aboutWork.titles)"
      @open="emit('open', aboutWork.slug)"
    />
  </template>
</template>

<style scoped>
.sep {
  height: 1px;
  background: var(--accent-line-soft);
  margin: var(--space-lg) var(--space-2xs) var(--space-md);
}
</style>
