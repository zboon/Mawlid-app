/* Übersetzungszeilen → ein Objekt je Feld. */

import { Lang, type Localized } from '@mawalid/shared'

const LANGS = new Set<string>(Lang.options)

export const isLang = (v: string): v is Lang => LANGS.has(v)

/* Leere Zeichenketten werden weggelassen, damit der Rückfall im Client
   greift: `titles.de ?? titles.en ?? titles.ar` soll nicht auf "" landen.
   Das ist kein Bereinigen von Text — der Text bleibt Zeichen für Zeichen,
   wie er ist; es wird nur entschieden, ob das Feld überhaupt erscheint. */
export function localized<T extends { lang: string }>(
  rows: readonly T[],
  field: keyof T,
): Localized {
  const out: Localized = {}
  for (const row of rows) {
    const value = row[field]
    if (typeof value === 'string' && value !== '' && isLang(row.lang)) {
      out[row.lang] = value
    }
  }
  return out
}

/* Welche Übersetzung liefern wir? Gewünschte Sprache, sonst Englisch, sonst
   Deutsch, sonst die erste vorhandene. `fallback` sagt, was gewünscht war —
   der Client kann damit „Übersetzung auf Englisch" anzeigen, statt so zu tun,
   als gäbe es keine. */
export function resolveLang(
  available: readonly string[],
  want: Lang,
): { lang: Lang; fallback: Lang | null } {
  if (available.includes(want)) return { lang: want, fallback: null }
  for (const candidate of ['en', 'de', 'ar', 'tr'] as const) {
    if (available.includes(candidate)) return { lang: candidate, fallback: want }
  }
  return { lang: want, fallback: null }
}
