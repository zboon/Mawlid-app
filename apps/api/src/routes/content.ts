/* Zone 1 · Inhalt.
 *
 * Alles Veröffentlichte, anonym lesbar, stark gecacht, kein Schreiben.
 * Die Zonentrennung aus docs/architecture/04-backend-api.md ist hier ein
 * eigenes Plugin: ein Endpunkt kann nicht versehentlich in die falsche Zone
 * rutschen, weil er dafür die Datei wechseln müsste.
 */

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  CollectionDetail,
  Lang,
  ModuleDetail,
  ModuleList,
  ScheduleToday,
  WorkDetail,
  type Annotation,
  type CollectionSummary,
  type Counts,
  type Folio,
  type MediaItem,
  type ModuleSummary,
  type Verse,
  type VerseText,
  type WorkRef,
  type WorkSummary,
} from '@mawalid/shared'
import { num, prisma } from '../lib/prisma.js'
import { cachedJson } from '../lib/http.js'
import { isLang, localized, resolveLang } from '../lib/localized.js'
import { badRequest, conflict, notFound } from '../lib/errors.js'

/* ── Zählungen ─────────────────────────────────────────────────────────────
 *
 * Aus den Ansichten, die db/schema.sql dafür anlegt. `CAST(… AS SIGNED)`,
 * weil SUM() sonst DECIMAL liefert und der Treiber daraus ein Dezimalobjekt
 * macht statt einer Zahl.
 *
 * Beide Ansichten werden vollständig gelesen und im Speicher zugeordnet. Das
 * sind heute elf Zeilen; auch bei zweihundert Sammlungen wäre eine gefilterte
 * Abfrage nicht messbar schneller, aber deutlich fehleranfälliger.
 */

const EMPTY_COUNTS: Counts = { collections: 0, works: 0, verses: 0 }

/* MySQL antwortet auf COUNT()/SUM() mit BIGINT; Prisma reicht das als
   JavaScript-BigInt durch — auch für `module_id`. Ein `Map<number, …>` mit
   BigInt-Schlüsseln trifft nie, und die Zählungen wären still alle null. */
type ModuleCountRow = { module_id: bigint; collections: bigint; works: bigint; verses: bigint }

async function moduleCounts(): Promise<Map<number, Counts>> {
  const rows = await prisma.$queryRaw<ModuleCountRow[]>`
    SELECT c.module_id                                       AS module_id,
           CAST(COUNT(*) AS SIGNED)                          AS collections,
           CAST(COALESCE(SUM(vc.work_count),  0) AS SIGNED)  AS works,
           CAST(COALESCE(SUM(vc.verse_count), 0) AS SIGNED)  AS verses
      FROM collections c
      JOIN v_collection_counts vc ON vc.collection_id = c.id
     WHERE c.is_published = 1
     GROUP BY c.module_id`
  return new Map(
    rows.map((r) => [
      num(r.module_id),
      { collections: num(r.collections), works: num(r.works), verses: num(r.verses) },
    ]),
  )
}

type CollectionCountRow = { collection_id: bigint; work_count: bigint; verse_count: bigint }

async function collectionCounts(): Promise<Map<number, Counts>> {
  const rows = await prisma.$queryRaw<CollectionCountRow[]>`
    SELECT collection_id, work_count, verse_count FROM v_collection_counts`
  return new Map(
    rows.map((r) => [
      num(r.collection_id),
      { collections: 0, works: num(r.work_count), verses: num(r.verse_count) },
    ]),
  )
}

/* Die Summe aller Sammlungszähler. Sie ändert sich, sobald sich irgendwo
   Inhalt ändert, und ist damit der Versionsanteil des ETags für die Listen,
   die über Sammlungsgrenzen hinweg antworten. */
async function totalContentVersion(): Promise<number> {
  const rows = await prisma.$queryRaw<{ v: bigint }[]>`
    SELECT CAST(COALESCE(SUM(content_version), 0) AS SIGNED) AS v FROM collections`
  return num(rows[0]?.v)
}

/* ── Abbildung Datenbank → Antwort ─────────────────────────────────────────
 *
 * Bewusst von Hand und an einer Stelle. Prisma liefert die Spaltennamen der
 * Datenbank (`short_page`), die API spricht die der Oberfläche (`shortPage`).
 * Dazwischen gehört genau eine Übersetzung, keine zwei halben.
 */

type TranslationRow = { lang: string; title?: string | null; subtitle?: string | null; description?: string | null; note?: string | null }

function toModuleSummary(
  m: {
    slug: string
    view_type: string
    icon_key: string | null
    sort_order: number
    external_url: string | null
    module_translations: TranslationRow[]
  },
  counts: Map<number, Counts>,
  id: number,
): ModuleSummary {
  return {
    slug: m.slug,
    viewType: m.view_type as ModuleSummary['viewType'],
    iconKey: m.icon_key,
    sortOrder: m.sort_order,
    externalUrl: m.external_url,
    titles: localized(m.module_translations, 'title'),
    subtitles: localized(m.module_translations, 'subtitle'),
    descriptions: localized(m.module_translations, 'description'),
    counts: counts.get(id) ?? EMPTY_COUNTS,
  }
}

function toCollectionSummary(
  c: {
    id: number
    slug: string
    sort_order: number
    collection_translations: TranslationRow[]
    schedules: { id: number }[]
    sequences: { id: number }[]
    other_collections?: { is_published: boolean }[]
  },
  counts: Map<number, Counts>,
): CollectionSummary {
  const base = counts.get(c.id) ?? EMPTY_COUNTS
  return {
    slug: c.slug,
    sortOrder: c.sort_order,
    titles: localized(c.collection_translations, 'title'),
    subtitles: localized(c.collection_translations, 'subtitle'),
    counts: {
      ...base,
      collections: (c.other_collections ?? []).filter((x) => x.is_published).length,
    },
    hasSchedule: c.schedules.length > 0,
    hasSequence: c.sequences.length > 0,
  }
}

const collectionSummaryInclude = {
  collection_translations: true,
  schedules: { select: { id: true } },
  sequences: { select: { id: true } },
  other_collections: { select: { is_published: true } },
} as const

const workSummaryInclude = {
  work_translations: true,
  media: { select: { kind: true } },
  sequence_items: { select: { ordinal: true, source_label: true }, orderBy: { ordinal: 'asc' } },
  schedule_slots: { select: { weekday: true } },
  _count: { select: { verses: true } },
} as const

type WorkSummaryRow = {
  slug: string
  sort_order: number
  cartouche: string | null
  primary_script: string
  primary_lang: string
  has_folios: boolean
  work_translations: TranslationRow[]
  media: { kind: string }[]
  sequence_items: { ordinal: number; source_label: string | null }[]
  schedule_slots: { weekday: number }[]
  _count: { verses: number }
}

function toWorkSummary(w: WorkSummaryRow): WorkSummary {
  const seq = w.sequence_items[0] ?? null
  return {
    slug: w.slug,
    sortOrder: w.sort_order,
    titles: localized(w.work_translations, 'title'),
    cartouche: w.cartouche,
    primaryScript: w.primary_script as WorkSummary['primaryScript'],
    primaryLang: (isLang(w.primary_lang) ? w.primary_lang : 'ar') as WorkSummary['primaryLang'],
    hasFolios: w.has_folios,
    verseCount: w._count.verses,
    hasAudio: w.media.some((m) => m.kind === 'audio'),
    hasVideo: w.media.some((m) => m.kind === 'video'),
    ordinal: seq ? seq.ordinal : null,
    sourceLabel: seq ? seq.source_label : null,
    weekdays: [...new Set(w.schedule_slots.map((s) => s.weekday))].sort((a, b) => a - b),
  }
}

const workRef = (w: { slug: string; work_translations: TranslationRow[] }): WorkRef => ({
  slug: w.slug,
  titles: localized(w.work_translations, 'title'),
})

/* ── Anfrageparameter ──────────────────────────────────────────────────── */

const LangQuery = z.object({ lang: Lang.default('de') })

/* Slugs sind laut Schema nur INNERHALB ihrer Ebene eindeutig
   (`uq_works_slug (collection_id, slug)`). Heute kollidiert nichts, aber
   „heute nicht" ist keine Zusicherung. Statt still eine Zeile zu wählen,
   antwortet die API mit 409 und nennt die Kandidaten; `?collection=` löst
   es auf. Ein falsches Werk auszuliefern wäre der schlimmere Ausgang. */
function unique<T extends { slug: string }>(
  rows: T[],
  kind: { code: 'WORK' | 'COLLECTION'; label: string; hint: string },
  slug: string,
  describe: (row: T) => string,
): T {
  const first = rows[0]
  if (!first) {
    throw notFound(
      `${kind.code}_NOT_FOUND`,
      `Kein veröffentlichtes ${kind.label} mit dem Kürzel '${slug}'.`,
    )
  }
  if (rows.length > 1) {
    throw conflict(
      `${kind.code}_AMBIGUOUS`,
      `Das Kürzel '${slug}' gibt es mehrfach. ${kind.hint}`,
      rows.map(describe),
    )
  }
  return first
}

/* Fehlercodes bleiben englisch und unverändert — sie sind für Programme.
   Die Meldung daneben ist für Menschen und darf sich ändern. */
const WORK = { code: 'WORK', label: 'Werk', hint: 'Mit ?collection=… eindeutig machen.' } as const
const COLLECTION = {
  code: 'COLLECTION',
  label: 'Sammlung',
  hint: 'Mit ?module=… eindeutig machen.',
} as const

/* ── Das Plugin ────────────────────────────────────────────────────────── */

export async function contentRoutes(app: FastifyInstance) {
  /* Alle Module fürs 3×3-Raster der Startseite.
     Ohne `?lang`: die Titel sind wenige Kilobyte, und die Startkachel zeigt
     ohnehin zwei Sprachen gleichzeitig (arabisch groß, Landessprache klein).
     Eine Antwort für alle Sprachen ist hier kleiner als vier Cache-Einträge. */
  app.get('/modules', async (req, reply) => {
    const [modules, counts, version] = await Promise.all([
      prisma.modules.findMany({
        where: { is_published: true },
        orderBy: { sort_order: 'asc' },
        include: { module_translations: true },
      }),
      moduleCounts(),
      totalContentVersion(),
    ])

    const body: ModuleList = {
      modules: modules.map((m) => toModuleSummary(m, counts, m.id)),
    }
    return cachedJson(req, reply, { scope: 'modules', version, body, schema: ModuleList })
  })

  /* Ein Modul mit seinen Sammlungen. Nur die oberste Ebene — Unterebenen
     hängen an der jeweiligen Sammlung, damit ein tiefer Baum nicht die
     Antwort für die Übersicht aufbläht. */
  app.get('/modules/:slug', async (req, reply) => {
    const { slug } = z.object({ slug: z.string().min(1) }).parse(req.params)

    const mod = await prisma.modules.findFirst({
      where: { slug, is_published: true },
      include: {
        module_translations: true,
        collections: {
          where: { is_published: true, parent_id: null },
          orderBy: { sort_order: 'asc' },
          include: collectionSummaryInclude,
        },
      },
    })
    if (!mod) throw notFound('MODULE_NOT_FOUND', `Kein veröffentlichtes Modul mit dem Kürzel '${slug}'.`)

    const [mCounts, cCounts] = await Promise.all([moduleCounts(), collectionCounts()])
    const version = mod.collections.reduce((max, c) => Math.max(max, num(c.content_version)), 0)

    const body: ModuleDetail = {
      ...toModuleSummary(mod, mCounts, mod.id),
      collections: mod.collections.map((c) => toCollectionSummary(c, cCounts)),
      contentVersion: version,
    }
    return cachedJson(req, reply, { scope: `module-${slug}`, version, body, schema: ModuleDetail })
  })

  /* Eine Sammlung mit ihren Werken. Das ist die Liste, aus der heraus gelesen
     wird — sie trägt alles, was auf einer Werkkarte steht, und keinen Vers. */
  app.get('/collections/:slug', async (req, reply) => {
    const { slug } = z.object({ slug: z.string().min(1) }).parse(req.params)
    const { module: moduleSlug } = z.object({ module: z.string().optional() }).parse(req.query)

    const matches = await prisma.collections.findMany({
      where: {
        slug,
        is_published: true,
        modules: { is_published: true, ...(moduleSlug ? { slug: moduleSlug } : {}) },
      },
      include: {
        ...collectionSummaryInclude,
        modules: { include: { module_translations: true } },
        collections: { include: { collection_translations: true } },
        works: {
          where: { status: 'published' },
          orderBy: { sort_order: 'asc' },
          include: workSummaryInclude,
        },
      },
    })

    const coll = unique(matches, COLLECTION, slug, (c) => `${c.modules.slug}/${c.slug}`)

    const children = await prisma.collections.findMany({
      where: { parent_id: coll.id, is_published: true },
      orderBy: { sort_order: 'asc' },
      include: collectionSummaryInclude,
    })

    const cCounts = await collectionCounts()
    const version = num(coll.content_version)

    const body: CollectionDetail = {
      ...toCollectionSummary(coll, cCounts),
      module: {
        slug: coll.modules.slug,
        titles: localized(coll.modules.module_translations, 'title'),
        viewType: coll.modules.view_type as CollectionDetail['module']['viewType'],
      },
      descriptions: localized(coll.collection_translations, 'description'),
      parent: coll.collections
        ? {
            slug: coll.collections.slug,
            titles: localized(coll.collections.collection_translations, 'title'),
          }
        : null,
      children: children.map((c) => toCollectionSummary(c, cCounts)),
      works: coll.works.map(toWorkSummary),
      contentVersion: version,
    }
    return cachedJson(req, reply, {
      scope: `collection-${coll.modules.slug}-${slug}`,
      version,
      body,
      schema: CollectionDetail,
    })
  })

  /* Ein Werk in einem Stück: Verse, Blätter, Medien, Glossen.
   *
   * Der größte Text hat 213 Verse — rund 90 KB JSON. Ein Wasserfall aus
   * Einzelabfragen wäre langsamer, und die Buchansicht braucht ohnehin ALLE
   * Verse gleichzeitig, um die Blatthöhen zu berechnen.
   */
  app.get('/works/:slug', async (req, reply) => {
    const { slug } = z.object({ slug: z.string().min(1) }).parse(req.params)
    const { lang } = LangQuery.parse(req.query)
    const { collection: collectionSlug } = z.object({ collection: z.string().optional() }).parse(req.query)

    const matches = await prisma.works.findMany({
      where: {
        slug,
        status: 'published',
        collections: {
          is_published: true,
          modules: { is_published: true },
          ...(collectionSlug ? { slug: collectionSlug } : {}),
        },
      },
      include: {
        work_translations: true,
        collections: {
          include: {
            collection_translations: true,
            modules: { include: { module_translations: true } },
          },
        },
        verses: { orderBy: { position: 'asc' }, include: { verse_texts: true } },
        folios: { orderBy: { position: 'asc' } },
        media: { orderBy: { sort_order: 'asc' }, include: { reciters: true } },
        sequence_items: { select: { ordinal: true }, orderBy: { ordinal: 'asc' } },
        schedule_slots: { select: { weekday: true } },
      },
    })

    const work = unique(matches, WORK, slug, (w) => `${w.collections.slug}/${w.slug}`)

    /* Welche Übersetzungssprachen hat DIESES Werk? Danach richtet sich, was
       geliefert wird — nicht danach, was die Datenbank irgendwo hat. */
    const available = [
      ...new Set(
        work.verses.flatMap((v) =>
          v.verse_texts.filter((t) => t.role === 'translation').map((t) => t.lang),
        ),
      ),
    ]
    const resolved = resolveLang(available, lang)

    const verses: Verse[] = work.verses.map((v) => {
      const text = (role: 'original' | 'transliteration' | 'translation'): VerseText | null => {
        const row =
          role === 'translation'
            ? v.verse_texts.find((t) => t.role === role && t.lang === resolved.lang)
            : v.verse_texts.find((t) => t.role === role)
        if (!row) return null
        return {
          lang: isLang(row.lang) ? row.lang : 'ar',
          role,
          script: row.script,
          body: row.body,
        }
      }
      return {
        id: num(v.id),
        position: v.position,
        kind: v.verse_kind,
        bandLabel: v.band_label,
        noteLabel: v.note_label,
        separator: v.separator_mark,
        noRosette: v.no_rosette,
        shortPage: v.short_page,
        texts: {
          original: text('original'),
          transliteration: text('transliteration'),
          translation: text('translation'),
        },
      }
    })

    /* Glossen: die Regeln ohne `work_id` gelten für alle Werke, die mit für
       ihres. Eine Relation allein liefert nur die zweite Sorte — die erste
       ginge lautlos verloren, und der Text erschiene ohne Auszeichnung. */
    const annotationRows = await prisma.text_annotations.findMany({
      where: { is_active: true, OR: [{ work_id: null }, { work_id: work.id }] },
      orderBy: { sort_order: 'asc' },
      include: { text_annotation_translations: true },
    })
    const annotations: Annotation[] = annotationRows.map((a) => ({
      matchKind: a.match_kind,
      pattern: a.pattern,
      style: a.style,
      sortOrder: a.sort_order,
      glosses: localized(a.text_annotation_translations, 'gloss'),
    }))

    const folios: Folio[] = work.folios.map((f) => ({
      position: f.position,
      from: f.verse_from,
      to: f.verse_to,
      hasSections: f.has_sections,
      bandLabel: f.band_label,
    }))

    const media: MediaItem[] = work.media.map((m) => ({
      kind: m.kind,
      provider: m.provider,
      url: m.url,
      startSeconds: m.start_seconds,
      endSeconds: m.end_seconds,
      durationSeconds: m.duration_seconds,
      label: m.label,
      sortOrder: m.sort_order,
      reciter: m.reciters
        ? { slug: m.reciters.slug, nameLatin: m.reciters.name_latin, nameAr: m.reciters.name_ar }
        : null,
    }))

    /* Vorheriges und nächstes Werk derselben Sammlung — der Leser braucht
       „weiter", ohne zurück in die Liste zu müssen. */
    const siblings = await prisma.works.findMany({
      where: { collection_id: work.collection_id, status: 'published' },
      orderBy: { sort_order: 'asc' },
      select: { id: true, slug: true, work_translations: { select: { lang: true, title: true } } },
    })
    const here = siblings.findIndex((s) => s.id === work.id)
    const before = here > 0 ? siblings[here - 1] : undefined
    const after = here >= 0 ? siblings[here + 1] : undefined

    const version = num(work.collections.content_version)

    const body: WorkDetail = {
      slug: work.slug,
      sortOrder: work.sort_order,
      module: {
        slug: work.collections.modules.slug,
        titles: localized(work.collections.modules.module_translations, 'title'),
        viewType: work.collections.modules.view_type,
      },
      collection: {
        slug: work.collections.slug,
        titles: localized(work.collections.collection_translations, 'title'),
      },
      primaryScript: work.primary_script,
      primaryLang: isLang(work.primary_lang) ? work.primary_lang : 'ar',
      cartouche: work.cartouche,
      hasFolios: work.has_folios,
      titles: localized(work.work_translations, 'title'),
      notes: localized(work.work_translations, 'note'),
      lang: resolved.lang,
      langFallback: resolved.fallback,
      verses,
      folios,
      media,
      annotations,
      ordinal: work.sequence_items[0]?.ordinal ?? null,
      weekdays: [...new Set(work.schedule_slots.map((s) => s.weekday))].sort((a, b) => a - b),
      prev: before ? workRef(before) : null,
      next: after ? workRef(after) : null,
      contentVersion: version,
    }

    return cachedJson(req, reply, {
      scope: `work-${work.collections.slug}-${slug}-${resolved.lang}`,
      version,
      body,
      schema: WorkDetail,
    })
  })

  /* „Was ist heute dran?"
   *
   * Der Wochentag kommt vom Client. Das ist Absicht: sonst entschiede die
   * Zeitzone des Datenbankservers, welcher Teil am Freitagabend gilt — und
   * die stimmt selten mit der des Lesers überein.
   */
  app.get('/schedule/:collection/today', async (req, reply) => {
    const { collection: collectionSlug } = z
      .object({ collection: z.string().min(1) })
      .parse(req.params)
    const query = z
      .object({
        weekday: z.coerce.number().int().min(0).max(6).optional(),
        module: z.string().optional(),
      })
      .safeParse(req.query)
    if (!query.success) {
      throw badRequest('BAD_WEEKDAY', 'weekday muss zwischen 0 (Sonntag) und 6 (Samstag) liegen.')
    }
    const weekday = query.data.weekday ?? new Date().getDay()

    const matches = await prisma.collections.findMany({
      where: {
        slug: collectionSlug,
        is_published: true,
        modules: { is_published: true, ...(query.data.module ? { slug: query.data.module } : {}) },
      },
      include: {
        collection_translations: true,
        modules: { select: { slug: true } },
        schedules: { include: { schedule_slots: { where: { weekday }, orderBy: { slot_index: 'asc' } } } },
      },
    })

    const coll = unique(matches, COLLECTION, collectionSlug, (c) => `${c.modules.slug}/${c.slug}`)

    const schedule = coll.schedules[0]
    if (!schedule) {
      throw notFound('SCHEDULE_NOT_FOUND', `Die Sammlung '${collectionSlug}' hat keinen Wochenplan.`)
    }

    const workIds = schedule.schedule_slots.map((s) => s.work_id)
    const works = await prisma.works.findMany({
      where: { id: { in: workIds }, status: 'published' },
      include: workSummaryInclude,
    })
    /* In der Reihenfolge der Plätze, nicht in der der Werke: der Montag hat
       zwei Teile, und der zweite ist nicht der mit der kleineren ID. */
    const byId = new Map(works.map((w) => [w.id, w]))
    const ordered = schedule.schedule_slots
      .map((s) => byId.get(s.work_id))
      .filter((w): w is NonNullable<typeof w> => w !== undefined)

    const version = num(coll.content_version)
    const body: ScheduleToday = {
      collection: {
        slug: coll.slug,
        titles: localized(coll.collection_translations, 'title'),
      },
      schedule: { slug: schedule.slug, cycle: schedule.cycle },
      weekday,
      works: ordered.map(toWorkSummary),
    }

    return cachedJson(req, reply, {
      scope: `schedule-${coll.slug}-${weekday}`,
      version,
      body,
      schema: ScheduleToday,
    })
  })
}
