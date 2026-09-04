/* Die Gliederung eines Wochenplan-Index — was in der Vorlage in Array-Indizes
 * steckte (DALAIL_DAYS: 6…13), hier aus den Daten abgeleitet.
 *
 * Ein solcher Index hat drei Zonen, in Buchreihenfolge:
 *   davor   Werke vor dem ersten Tagesteil (Titelblatt, Eröffnung, Namen …)
 *   Raster  die Tagesteile — die geplanten Werke, PLUS ein ungeplantes Werk,
 *           das direkt auf ein geplantes folgt: das ist „Montag, Teil 2".
 *           Der Wochenzeiger der Vorlage zeigt nur auf Teil 1; Teil 2 steht
 *           trotzdem im Raster, als achte Blase.
 *   danach  was nach den Tagesteilen kommt (das Abschlussgebet).
 */

import type { WorkSummary } from '@mawalid/shared'
import { AR_DIGITS, AR_WEEKDAYS } from './arabicLabels'

export interface SchedulePartition {
  before: WorkSummary[]
  grid: WorkSummary[]
  after: WorkSummary[]
}

export function partitionScheduleWorks(works: readonly WorkSummary[]): SchedulePartition {
  const first = works.findIndex((w) => w.weekdays.length > 0)
  if (first === -1) return { before: [], grid: [], after: [...works] }

  /* Das Raster ist der zusammenhängende Lauf der GEPLANTEN Werke. Auch die
     zweiten Tagesteile stehen im Plan (schedule_slots.slot_index 1) und
     tragen ihren Wochentag — eine Nachbarschaftsregel („ungeplant, aber
     direkt hinter einem geplanten Werk") stand hier zuerst und zog prompt
     das Abschlussgebet als neunte Blase ins Raster. */
  let end = first
  while (end < works.length && (works[end]?.weekdays.length ?? 0) > 0) end += 1

  return { before: works.slice(0, first), grid: works.slice(first, end), after: works.slice(end) }
}

export interface DayBubbleData {
  slug: string
  weekday: number | null
  /* Teil-2-Blasen tragen die Nummer, die Tagesblasen nicht. */
  part: number
}

/* Blasen mit Wochentag und Teilnummer. Die Beschriftung („Mo ²") entsteht in
   der Ansicht aus weekday+part — hier nur die Zuordnung, damit sie prüfbar
   bleibt, ohne i18n zu laden. Ein zweiter Teil desselben Tages steht als
   zweiter Platz im Wochenplan und trägt denselben Wochentag; die Teilnummer
   ist, das wievielte Werk seines Tages er im Raster ist. Aus der
   NACHBARSCHAFT ließ sie sich nicht ableiten — „Montag, Teil 2" steht im
   Buch hinter dem Sonntag, und der Sonntag ist nicht sein Tag. */
export function dayBubbles(grid: readonly WorkSummary[]): DayBubbleData[] {
  const seen = new Map<number, number>()
  return grid.map((work) => {
    const weekday = work.weekdays[0] ?? null
    if (weekday === null) return { slug: work.slug, weekday: null, part: 1 }
    const part = (seen.get(weekday) ?? 0) + 1
    seen.set(weekday, part)
    return { slug: work.slug, weekday, part }
  })
}

export const arabicWeekday = (weekday: number | null, part: number): string => {
  if (weekday === null) return ''
  const base = AR_WEEKDAYS[weekday] ?? ''
  return part > 1 ? `${base} ${AR_DIGITS[part] ?? ''}` : base
}
