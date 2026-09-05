/* Zone 2 · Persönlich — Favoriten, Lesepositionen, Markierungen,
 * Anzeigeeinstellungen (docs/architecture/04-backend-api.md).
 *
 * Alles hier gehört einem Besitzer: einem Gerät (X-Device-Id, anonym) oder
 * später einem Konto. Die Daten liegen IMMER auch im localStorage; die API
 * ist die Sicherung, die das Gerät überdauert, nicht die Quelle der Wahrheit
 * für den laufenden Betrieb.
 */

import { z } from 'zod'
import { Localized } from './content.js'

export const ViewMode = z.enum(['study', 'book'])
export type ViewMode = z.infer<typeof ViewMode>

/* Die Grenzen sind die der Regler (stores/reader.ts bzw. SCROLL_SPEEDS):
   was der Regler nicht einstellen kann, nimmt der Server nicht an. */
export const DisplaySettings = z.object({
  viewMode: ViewMode.nullable(),
  arScale: z.number().min(0.7).max(1.6).nullable(),
  latinScale: z.number().min(0.8).max(1.8).nullable(),
  showTransliteration: z.boolean().nullable(),
  showTranslation: z.boolean().nullable(),
  twoPages: z.boolean().nullable(),
  scrollSpeedIdx: z.number().int().min(0).max(8).nullable(),
})
export type DisplaySettings = z.infer<typeof DisplaySettings>

/* Beim Schreiben sind alle Felder freiwillig: geschickt wird, was sich
   geändert hat, der Rest bleibt stehen. */
export const DisplaySettingsInput = DisplaySettings.partial()
export type DisplaySettingsInput = z.infer<typeof DisplaySettingsInput>

/* Ein Favorit kommt mit allem zurück, was die Favoritenliste zum Rendern
   braucht — sie soll ohne weitere Abfragen auskommen, wie favItems() in der
   Vorlage aus dem Speicher rendert. */
export const FavoriteEntry = z.object({
  module: z.string(),
  collection: z.string(),
  work: z.string(),
  titles: Localized,
  hasFolios: z.boolean(),
  sortOrder: z.number().int(),
})
export type FavoriteEntry = z.infer<typeof FavoriteEntry>

export const FavoriteInput = z.object({
  sortOrder: z.number().int().optional(),
})
export type FavoriteInput = z.infer<typeof FavoriteInput>

/* Je Werk EINE Position (uq_pos_device/user in der Datenbank). `position`
   ist Verse.position — die Zahl, die die Wiederaufnahme-Karte anzeigt und
   auf die der Leser springt. */
export const PositionEntry = z.object({
  module: z.string(),
  collection: z.string(),
  work: z.string(),
  titles: Localized,
  verseId: z.number().int().nullable(),
  position: z.number().int().nonnegative().nullable(),
  segmentIndex: z.number().int().nonnegative().nullable(),
  viewMode: ViewMode,
  updatedAt: z.string(),
})
export type PositionEntry = z.infer<typeof PositionEntry>

export const PositionInput = z.object({
  verseId: z.number().int().nullable(),
  segmentIndex: z.number().int().min(0).max(999).nullable(),
  viewMode: ViewMode,
})
export type PositionInput = z.infer<typeof PositionInput>

export const MarkEntry = z.object({
  verseId: z.number().int(),
  segmentIndex: z.number().int().nonnegative(),
})
export type MarkEntry = z.infer<typeof MarkEntry>

/* GET /api/me — der ganze persönliche Zustand in einer Antwort, damit der
   Start der App mit einem einzigen Abgleich auskommt. */
export const MeState = z.object({
  device: z.object({ publicId: z.string() }),
  favorites: z.array(FavoriteEntry),
  positions: z.array(PositionEntry),
  marks: z.array(MarkEntry),
  settings: DisplaySettings.nullable(),
})
export type MeState = z.infer<typeof MeState>
