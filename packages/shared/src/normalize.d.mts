/* Typen zu normalize.mjs — von Hand gepflegt, weil die Implementierung als
   .mjs vorliegt (siehe Kopf dort). Signaturen hier ändern sich nur, wenn
   sich die Implementierung ändert. */

/** Volle Faltung. Für arabischen Originaltext und dessen Umschrift —
    und, per Entscheidung in 05-database.md §6, für alle anderen Sprachen. */
export function normalizeArabic(str: string | null | undefined): string

/** Zweite Stufe: ohne Leerzeichen, Doppelbuchstaben erneut zusammengezogen. */
export function tighten(normalized: string | null | undefined): string

/** Milde Reserve-Variante (Kleinschreibung, Diakritika, Satzzeichen). */
export function normalizeLatin(str: string | null | undefined, lang?: string): string

/** Wählt nach Sprache — Bestandsschutz; die Suche benutzt normalizeArabic. */
export function normalizeFor(lang: string, str: string | null | undefined): string
