/* Die Form der Inhaltsantworten — einmal, für beide Seiten.
 *
 * Der Server prüft mit diesen Schemas, was er hinausgibt. Die Oberfläche
 * importiert daraus nur die TYPEN (`import type`), damit Zod nicht im Bündel
 * landet: bei 2.512 Versen wäre eine zweite Prüfung im Browser reine
 * Rechenzeit ohne Erkenntnis. Die Aussage der Roadmap — „Zod-Schemas, aus
 * denen die Frontend-Typen entstehen" — ist damit wörtlich erfüllt.
 *
 * Eine Regel, die hier leicht verloren geht: KEIN `.trim()`, kein
 * `.transform()` auf einem Textfeld. Ein beschnittenes Leerzeichen in
 * vokalisiertem Arabisch fällt niemandem auf und ist trotzdem ein Fehler.
 * Siehe docs/architecture/04-backend-api.md.
 */

import { z } from 'zod'

/* ── Aufzählungen, wortgleich mit db/schema.sql ─────────────────────────── */

export const Lang = z.enum(['ar', 'de', 'en', 'tr'])
export type Lang = z.infer<typeof Lang>

export const Script = z.enum(['arab', 'latn'])
export type Script = z.infer<typeof Script>

export const ViewType = z.enum(['recitation', 'article', 'wiki', 'tree', 'media', 'link'])
export type ViewType = z.infer<typeof ViewType>

export const VerseKind = z.enum(['verse', 'refrain', 'instruction', 'basmala'])
export type VerseKind = z.infer<typeof VerseKind>

export const TextRole = z.enum(['original', 'transliteration', 'translation'])
export type TextRole = z.infer<typeof TextRole>

export const MediaKind = z.enum(['video', 'audio'])
export type MediaKind = z.infer<typeof MediaKind>

export const MediaProvider = z.enum(['youtube', 'file', 'external'])
export type MediaProvider = z.infer<typeof MediaProvider>

export const ScheduleCycle = z.enum(['weekly', 'monthly', 'yearly', 'none'])
export type ScheduleCycle = z.infer<typeof ScheduleCycle>

/* ── Mehrsprachige Felder ───────────────────────────────────────────────────
 *
 * Ausgeschrieben statt `z.record`, weil `record` mit einem Enum-Schlüssel in
 * Zod 3 einen VOLLSTÄNDIGEN Record ergibt — der Typ behauptete dann, jede
 * Sammlung habe einen deutschen Titel. Sie hat ihn nicht: `al-hizb-al-azam`
 * trägt heute nur `ar` und `en`. Mit optionalen Feldern zwingt der Compiler
 * an jeder Stelle zu einem Rückfall.
 */
export const Localized = z.object({
  ar: z.string().optional(),
  de: z.string().optional(),
  en: z.string().optional(),
  tr: z.string().optional(),
})
export type Localized = z.infer<typeof Localized>

/* ── Zählungen ─────────────────────────────────────────────────────────── */

export const Counts = z.object({
  collections: z.number().int().nonnegative(),
  works: z.number().int().nonnegative(),
  verses: z.number().int().nonnegative(),
})
export type Counts = z.infer<typeof Counts>

/* ── Module ────────────────────────────────────────────────────────────── */

/* Die Kachelfarbe eines Bereichs — osmanische Palette aus dem Zayd-Entwurf.
   Sie färbt die Startkachel und das gesamte Chrom des Bereichs. */
export const ThemeKey = z.enum([
  'green',
  'navy',
  'maroon',
  'teal',
  'ochre',
  'plum',
  'rust',
  'indigo',
  'neutral',
])
export type ThemeKey = z.infer<typeof ThemeKey>

export const ModuleSummary = z.object({
  slug: z.string(),
  viewType: ViewType,
  iconKey: z.string().nullable(),
  /* NULL heißt green — die Markenfarbe. */
  theme: ThemeKey.nullable(),
  /* Veröffentlicht, aber ohne Menükachel (Al-Aḥzāb): erreichbar über
     Querverweise, nicht über Startseite oder Tableiste. */
  inMenu: z.boolean(),
  sortOrder: z.number().int(),
  externalUrl: z.string().nullable(),
  titles: Localized,
  subtitles: Localized,
  descriptions: Localized,
  counts: Counts,
})
export type ModuleSummary = z.infer<typeof ModuleSummary>

export const ModuleList = z.object({
  modules: z.array(ModuleSummary),
})
export type ModuleList = z.infer<typeof ModuleList>

/* ── Sammlungen ────────────────────────────────────────────────────────── */

export const CollectionSummary = z.object({
  slug: z.string(),
  sortOrder: z.number().int(),
  titles: Localized,
  subtitles: Localized,
  counts: Counts,
  hasSchedule: z.boolean(),
  hasSequence: z.boolean(),
})
export type CollectionSummary = z.infer<typeof CollectionSummary>

export const ModuleDetail = ModuleSummary.extend({
  collections: z.array(CollectionSummary),
  contentVersion: z.number().int(),
})
export type ModuleDetail = z.infer<typeof ModuleDetail>

/* Ein Werk, wie es in einer Liste erscheint — genug für die Karte, ohne die
   Verse. Die Zahlen `ordinal` und `weekdays` sind das, was in der alten App
   im Titelpräfix „13 · …" und in DALAIL_TODAY_IDX steckte. */
export const WorkSummary = z.object({
  slug: z.string(),
  sortOrder: z.number().int(),
  titles: Localized,
  cartouche: z.string().nullable(),
  primaryScript: Script,
  primaryLang: Lang,
  hasFolios: z.boolean(),
  verseCount: z.number().int().nonnegative(),
  hasAudio: z.boolean(),
  hasVideo: z.boolean(),
  /* Laufende Nummer in der Lesereihenfolge, falls das Werk in einer steht. */
  ordinal: z.number().int().nullable(),
  /* Die Nummer des gedruckten Buches („13", „13b"). */
  sourceLabel: z.string().nullable(),
  /* 0 = Sonntag … 6 = Samstag, wie Date.getDay(). Meist leer; die sieben
     Wochenteile der Dalāʾil tragen je genau einen Eintrag. */
  weekdays: z.array(z.number().int().min(0).max(6)),
})
export type WorkSummary = z.infer<typeof WorkSummary>

export const CollectionDetail = CollectionSummary.extend({
  module: z.object({ slug: z.string(), titles: Localized, viewType: ViewType }),
  descriptions: Localized,
  parent: z.object({ slug: z.string(), titles: Localized }).nullable(),
  children: z.array(CollectionSummary),
  works: z.array(WorkSummary),
  contentVersion: z.number().int(),
})
export type CollectionDetail = z.infer<typeof CollectionDetail>

/* ── Werk mit allem, was der Leser braucht ─────────────────────────────── */

export const VerseText = z.object({
  lang: Lang,
  role: TextRole,
  script: Script,
  body: z.string(),
})
export type VerseText = z.infer<typeof VerseText>

export const Verse = z.object({
  id: z.number().int(),
  position: z.number().int().nonnegative(),
  kind: VerseKind,
  bandLabel: z.string().nullable(),
  noteLabel: z.string().nullable(),
  separator: z.string().nullable(),
  noRosette: z.boolean(),
  shortPage: z.boolean(),
  texts: z.object({
    original: VerseText.nullable(),
    transliteration: VerseText.nullable(),
    translation: VerseText.nullable(),
  }),
})
export type Verse = z.infer<typeof Verse>

/* Ein Blatt der Buchansicht: ein Versbereich, beide Grenzen einschließlich.
   `from`/`to` zeigen auf `Verse.position`, nicht auf `Verse.id`. */
export const Folio = z.object({
  position: z.number().int().nonnegative(),
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
  hasSections: z.boolean(),
  bandLabel: z.string().nullable(),
})
export type Folio = z.infer<typeof Folio>

export const Reciter = z.object({
  slug: z.string(),
  nameLatin: z.string(),
  nameAr: z.string().nullable(),
})
export type Reciter = z.infer<typeof Reciter>

export const MediaItem = z.object({
  kind: MediaKind,
  provider: MediaProvider,
  url: z.string(),
  startSeconds: z.number().int().nullable(),
  endSeconds: z.number().int().nullable(),
  durationSeconds: z.number().int().nullable(),
  label: z.string().nullable(),
  sortOrder: z.number().int(),
  reciter: Reciter.nullable(),
})
export type MediaItem = z.infer<typeof MediaItem>

/* Redaktionelle Auszeichnung innerhalb des Verstextes — die goldene Glosse.
   Die Regeln kommen mit dem Werk mit, damit die Oberfläche sie nicht als
   Konstante mitschleppt (das war INLINE_INSTRUCTIONS in der alten App). */
export const Annotation = z.object({
  matchKind: z.enum(['literal', 'regex']),
  pattern: z.string(),
  style: z.enum(['gloss']),
  sortOrder: z.number().int(),
  glosses: Localized,
})
export type Annotation = z.infer<typeof Annotation>

export const WorkRef = z.object({
  slug: z.string(),
  titles: Localized,
})
export type WorkRef = z.infer<typeof WorkRef>

export const WorkDetail = z.object({
  slug: z.string(),
  sortOrder: z.number().int(),
  module: z.object({ slug: z.string(), titles: Localized, viewType: ViewType }),
  collection: z.object({ slug: z.string(), titles: Localized }),
  primaryScript: Script,
  primaryLang: Lang,
  cartouche: z.string().nullable(),
  hasFolios: z.boolean(),
  titles: Localized,
  notes: Localized,
  /* Die Übersetzungssprache, die tatsächlich geliefert wurde, und — falls
     die gewünschte fehlte — welche gewünscht war. Originaltext und Umschrift
     kommen immer mit, unabhängig davon. */
  lang: Lang,
  langFallback: Lang.nullable(),
  verses: z.array(Verse),
  folios: z.array(Folio),
  media: z.array(MediaItem),
  annotations: z.array(Annotation),
  ordinal: z.number().int().nullable(),
  weekdays: z.array(z.number().int().min(0).max(6)),
  prev: WorkRef.nullable(),
  next: WorkRef.nullable(),
  contentVersion: z.number().int(),
})
export type WorkDetail = z.infer<typeof WorkDetail>

/* ── „Was ist heute dran?" ─────────────────────────────────────────────── */

export const ScheduleToday = z.object({
  collection: z.object({ slug: z.string(), titles: Localized }),
  schedule: z.object({ slug: z.string(), cycle: ScheduleCycle }),
  /* Der Wochentag, für den geantwortet wurde — der Client übergibt ihn, damit
     die Zeitzone dort entschieden wird und nicht im Datenbankserver. */
  weekday: z.number().int().min(0).max(6),
  works: z.array(WorkSummary),
})
export type ScheduleToday = z.infer<typeof ScheduleToday>

/* ── Fehler ────────────────────────────────────────────────────────────── */

export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().nullable(),
  }),
})
export type ApiError = z.infer<typeof ApiError>
