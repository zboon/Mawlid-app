/* Der Suchindex: der ganze veröffentlichte Bestand, je Werk als vorbereiteter
 * Heuhaufen im Speicher.
 *
 * Warum im Speicher und nicht in MySQL: Der Vergleich der Vorlage ist ein
 * Vierfach-ODER aus Teilzeichenketten über handkalibrierte Faltungen — weder
 * FULLTEXT noch eine Kollation bilden das ab (05-database.md §6), und ein
 * LIKE über body_search deckte nur die erste der vier Stufen. Der Bestand ist
 * klein (109 Werke, 5.834 Verstexte, wenige Megabyte); ihn einmal zu laden
 * und in JavaScript exakt den Vorlagen-Algorithmus laufen zu lassen, ist der
 * einzige Weg, auf dem „dieselben Werke wie vorher" beweisbar bleibt. Die
 * Spalte body_search bleibt der dauerhafte, beim Speichern gepflegte Abdruck
 * für Werkzeuge und Gegenprüfungen.
 *
 * Der Index hängt an der content_version: ändert sie sich, wird beim nächsten
 * Suchaufruf neu geladen. Kein Zeitablauf, kein zweiter Mechanismus.
 */

import {
  buildHaystack,
  matchesHaystack,
  queryForms,
  verseHits,
  type Haystack,
  type Localized,
  type SearchWorkResult,
} from '@mawalid/shared'
import { num, prisma } from './prisma.js'
import { localized } from './localized.js'

type CorpusVerse = { id: number; position: number; ar?: string; tr?: string; en?: string }

type CorpusWork = {
  module: string
  collection: { slug: string; titles: Localized }
  work: { slug: string; titles: Localized; hasFolios: boolean }
  hay: Haystack
  verses: CorpusVerse[]
}

let cache: { version: number; works: CorpusWork[] } | null = null

export async function searchCorpus(version: number): Promise<CorpusWork[]> {
  if (cache && cache.version === version) return cache.works

  const rows = await prisma.works.findMany({
    where: {
      status: 'published',
      in_search: true,
      collections: { is_published: true, modules: { is_published: true } },
    },
    /* Kanonische Reihenfolge Modul → Sammlung → Werk, damit die Trefferliste
       so gruppiert ankommt, wie die Bereiche in der App stehen. */
    orderBy: [
      { collections: { modules: { sort_order: 'asc' } } },
      { collections: { sort_order: 'asc' } },
      { sort_order: 'asc' },
    ],
    include: {
      work_translations: true,
      collections: {
        select: {
          slug: true,
          collection_translations: true,
          modules: { select: { slug: true } },
        },
      },
      verses: { orderBy: { position: 'asc' }, include: { verse_texts: true } },
      sequence_items: { select: { source_label: true } },
    },
  })

  const works: CorpusWork[] = rows.map((w) => {
    const titles = localized(w.work_translations, 'title')
    /* Die Vorlage baut den Heuhaufen aus titleEnglish — und der trug dort
       noch die Nummer des gedruckten Buches („13 · Yā Nabī…"). Der Import
       hat sie nach sequence_items.source_label verlegt; für die Suche wird
       sie wieder vorangestellt, sonst fände „13" das Stück nicht mehr. */
    const label = w.sequence_items[0]?.source_label
    const titleEnglish = label ? `${label} · ${titles.en ?? ''}` : titles.en

    const verses: CorpusVerse[] = w.verses.map((v) => ({
      id: num(v.id),
      position: v.position,
      ar: v.verse_texts.find((t) => t.role === 'original')?.body,
      tr: v.verse_texts.find((t) => t.role === 'transliteration')?.body,
      /* Die Vorlage kennt genau eine Übersetzung je Vers, die englische.
         Kommt später eine deutsche dazu, braucht es hier eine Entscheidung,
         nicht nur ein weiteres find(). */
      en: v.verse_texts.find((t) => t.role === 'translation' && t.lang === 'en')?.body,
    }))

    /* Reihenfolge der Teile ist Vorlagenverhalten (siehe search-core.mjs):
       Titel en, Titel ar, dann je Vers tr, en, ar. */
    const parts: Array<string | undefined> = [titleEnglish, titles.ar]
    for (const v of verses) parts.push(v.tr, v.en, v.ar)

    return {
      module: w.collections.modules.slug,
      collection: {
        slug: w.collections.slug,
        titles: localized(w.collections.collection_translations, 'title'),
      },
      work: { slug: w.slug, titles, hasFolios: w.has_folios },
      hay: buildHaystack(parts),
      verses,
    }
  })

  cache = { version, works }
  return works
}

/* Ein Suchlauf über den vorbereiteten Bestand: Werke, deren Heuhaufen die
   Anfrage trifft, mit bis zu sechs Verstreffern und dem Rest als Zahl —
   die Kappung der Vorlage (hitList CAP = 6, gesammelt bis 40). */
export function runSearch(corpus: CorpusWork[], q: string): SearchWorkResult[] {
  const f = queryForms(q)
  const out: SearchWorkResult[] = []
  for (const w of corpus) {
    if (!matchesHaystack(w.hay, f)) continue
    const hits = verseHits(w.verses, f)
    out.push({
      module: w.module,
      collection: w.collection,
      work: w.work,
      hits: hits.slice(0, 6).map((h) => {
        const v = w.verses[h.n]
        return {
          position: v?.position ?? h.n,
          verseId: v?.id ?? 0,
          ar: h.ar,
          sec: h.sec,
          field: h.field,
          seg: h.seg,
        }
      }),
      moreHits: Math.max(0, hits.length - 6),
    })
  }
  return out
}
