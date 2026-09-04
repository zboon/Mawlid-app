/* Die zwei Fehler, die beim Nachbau des Dalāʾil-Index wirklich passiert sind,
   als Tests festgehalten:

   1. Die achte Blase hieß „So ²" — Montag Teil 2 bekam den Wochentag seines
      NACHBARN (Sonntag) statt seinen eigenen.
   2. Das Abschlussgebet rutschte als neunte Blase ins Raster, weil eine
      Nachbarschaftsregel jedes Werk hinter einem geplanten mitnahm. */

import { describe, expect, it } from 'vitest'
import type { WorkSummary } from '@mawalid/shared'
import { arabicWeekday, dayBubbles, partitionScheduleWorks } from './scheduleIndex'

const work = (slug: string, weekdays: number[]): WorkSummary => ({
  slug,
  sortOrder: 0,
  titles: {},
  cartouche: null,
  primaryScript: 'arab',
  primaryLang: 'ar',
  hasFolios: false,
  verseCount: 1,
  hasAudio: false,
  hasVideo: false,
  ordinal: null,
  sourceLabel: null,
  weekdays,
})

/* Die Wochenteile, wie sie in der Datenbank liegen: sechs Eröffnungswerke,
   Mo–So (getDay: Mo=1 … So=0), Montag Teil 2 mit demselben Wochentag als
   zweiter Planplatz, dann das Abschlussgebet. */
const dalail = [
  work('title-page', []),
  work('opening-dua', []),
  work('names-of-allah', []),
  work('refuge', []),
  work('sayyid-al-istighfar', []),
  work('names-of-the-prophet', []),
  work('monday-part-1', [1]),
  work('tuesday', [2]),
  work('wednesday', [3]),
  work('thursday', [4]),
  work('friday', [5]),
  work('saturday', [6]),
  work('sunday', [0]),
  work('monday-part-2', [1]),
  work('closing-dua', []),
]

describe('partitionScheduleWorks', () => {
  it('teilt die Wochenteile in davor / Raster / danach', () => {
    const p = partitionScheduleWorks(dalail)
    expect(p.before.map((w) => w.slug)).toEqual([
      'title-page',
      'opening-dua',
      'names-of-allah',
      'refuge',
      'sayyid-al-istighfar',
      'names-of-the-prophet',
    ])
    expect(p.grid).toHaveLength(8)
    expect(p.after.map((w) => w.slug)).toEqual(['closing-dua'])
  })

  it('zieht das Abschlussgebet NICHT ins Raster', () => {
    const p = partitionScheduleWorks(dalail)
    expect(p.grid.map((w) => w.slug)).not.toContain('closing-dua')
  })

  it('lässt ein Buch ohne Vorspann ganz im Raster (al-Aʿẓam: Sa zuerst)', () => {
    const azam = [6, 0, 1, 2, 3, 4, 5].map((d, i) => work(`tag-${i}`, [d]))
    const p = partitionScheduleWorks(azam)
    expect(p.before).toHaveLength(0)
    expect(p.grid).toHaveLength(7)
    expect(p.after).toHaveLength(0)
  })
})

describe('dayBubbles', () => {
  it('gibt Montag Teil 2 seinen EIGENEN Tag, nicht den des Nachbarn', () => {
    const bubbles = dayBubbles(partitionScheduleWorks(dalail).grid)
    const part2 = bubbles.find((b) => b.slug === 'monday-part-2')
    expect(part2).toEqual({ slug: 'monday-part-2', weekday: 1, part: 2 })
  })

  it('zählt Teile je Tag, nicht je Raster', () => {
    const bubbles = dayBubbles(partitionScheduleWorks(dalail).grid)
    expect(bubbles.filter((b) => b.part > 1)).toHaveLength(1)
  })

  it('setzt die arabische Teilnummer als arabische Ziffer', () => {
    expect(arabicWeekday(1, 2)).toBe('الِاثْنَيْن ٢')
    expect(arabicWeekday(1, 1)).toBe('الِاثْنَيْن')
  })
})
