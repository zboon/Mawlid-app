/* Die eine Zahl, an der man merkt, ob die Buchansicht richtig gebaut ist.
 *
 * Aus 46 Folio-Einträgen müssen 272 Blätter werden. Wer beim Umbau nur die
 * Folios auswertet und das Zeichen ‖ im Verstext übersieht, bekommt 46 sehr
 * volle Seiten — und es sieht nicht falsch aus, es sieht nur schlecht aus.
 * Genau deshalb ist das ein Test und keine Bemerkung im Dokument.
 *
 * Geprüft wird gegen data/extracted/, die festgehaltene Quelle aus Phase 2 —
 * nicht gegen die Datenbank und nicht gegen die API, damit der Test ohne
 * beides läuft.
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Verse, WorkDetail } from '@mawalid/shared'
import { buildLeaves } from './pages'

type SourceVerse = {
  ar?: string
  band?: string
  shortPage?: boolean
  noRosette?: boolean
  sep?: string
}
type SourcePiece = {
  titleArabic?: string
  cartouche?: string
  verses?: SourceVerse[]
  folios?: { from: number; to: number; band?: string; sections?: boolean }[]
}

const source = JSON.parse(
  readFileSync(new URL('../../../../data/extracted/_all.json', import.meta.url), 'utf8'),
) as Record<string, SourcePiece[]>

/* Nur die Felder, die buildLeaves anfasst. Der Rest der Antwort ist für
   diesen Test bedeutungslos und würde ihn nur schwerer lesbar machen. */
function asWork(piece: SourcePiece, moduleSlug: string): WorkDetail {
  const verses: Verse[] = (piece.verses ?? []).map((v, position) => ({
    id: position,
    position,
    kind: 'verse',
    bandLabel: v.band ?? null,
    noteLabel: null,
    separator: v.sep ?? null,
    noRosette: Boolean(v.noRosette),
    shortPage: Boolean(v.shortPage),
    texts: {
      original: { lang: 'ar', role: 'original', script: 'arab', body: v.ar ?? '' },
      transliteration: null,
      translation: null,
    },
  }))
  return {
    slug: 'x',
    sortOrder: 0,
    module: { slug: moduleSlug, titles: {}, viewType: 'recitation' },
    collection: { slug: 'x', titles: {} },
    primaryScript: 'arab',
    primaryLang: 'ar',
    cartouche: piece.cartouche ?? null,
    hasFolios: Boolean(piece.folios?.length),
    titles: { ar: piece.titleArabic ?? '' },
    notes: {},
    lang: 'en',
    langFallback: null,
    verses,
    folios: (piece.folios ?? []).map((f, position) => ({
      position,
      from: f.from,
      to: f.to,
      hasSections: Boolean(f.sections),
      bandLabel: f.band ?? null,
    })),
    media: [],
    annotations: [],
    ordinal: null,
    weekdays: [],
    prev: null,
    next: null,
    contentVersion: 1,
  }
}

const ARRAYS: Record<string, string> = {
  QASIDAS: 'mawlid',
  SIRAH_CHAPTERS: 'mawlid',
  BARZANJI_CHAPTERS: 'mawlid',
  DIYA_CHAPTERS: 'mawlid',
  BURDAH_CHAPTERS: 'mawlid',
  ILAHI_CHAPTERS: 'praises',
  NASHEED_CHAPTERS: 'praises',
  DALAIL_CHAPTERS: 'dalail',
  LITANY_CHAPTERS: 'ahzab',
}

const withFolios = () => {
  const out: WorkDetail[] = []
  for (const [name, moduleSlug] of Object.entries(ARRAYS)) {
    for (const piece of source[name] ?? []) {
      if (piece.folios?.length) out.push(asWork(piece, moduleSlug))
    }
  }
  return out
}

describe('buildLeaves', () => {
  it('macht aus 46 Folio-Einträgen 272 Blätter', () => {
    const works = withFolios()
    const folios = works.reduce((n, w) => n + w.folios.length, 0)
    const leaves = works.reduce((n, w) => n + buildLeaves(w).length, 0)

    expect(folios).toBe(46)
    expect(leaves).toBe(272)
  })

  it('deckt jeden Vers eines Werkes genau einmal ab', () => {
    for (const work of withFolios()) {
      const seen = new Set<number>()
      for (const leaf of buildLeaves(work)) {
        for (const item of leaf.items) seen.add(item.verse.position)
      }
      const covered = work.folios.flatMap((f) =>
        Array.from({ length: f.to - f.from + 1 }, (_, i) => f.from + i),
      )
      expect([...seen].sort((a, b) => a - b)).toEqual([...new Set(covered)].sort((a, b) => a - b))
    }
  })

  it('setzt keine Rosette, wo ein Vers auf das nächste Blatt weiterläuft', () => {
    const continued = withFolios()
      .flatMap((w) => buildLeaves(w))
      .flatMap((l) => l.items)
      .filter((i) => i.cont)
    /* 226 Umbruchzeichen im Bestand; jedes lässt genau dort einen Abschnitt
       ohne Rosette enden, sofern danach noch Text desselben Verses kommt. */
    expect(continued.length).toBeGreaterThan(0)
    for (const item of continued) expect(item.sub).not.toBeNull()
  })

  it('lässt die Kommata nur in den Dalāʾil und den Aḥzāb stehen', () => {
    const piece = (source.DALAIL_CHAPTERS ?? []).find((p) =>
      (p.verses ?? []).some((v) => (v.ar ?? '').includes('،')),
    )
    expect(piece).toBeDefined()
    if (!piece) return

    const kept = buildLeaves(asWork(piece, 'dalail'))
    const dropped = buildLeaves(asWork(piece, 'mawlid'))
    const text = (ls: ReturnType<typeof buildLeaves>) =>
      ls.flatMap((l) => l.items.map((i) => i.body)).join('')

    expect(text(kept)).toContain('،')
    expect(text(dropped)).not.toContain('،')
  })
})
