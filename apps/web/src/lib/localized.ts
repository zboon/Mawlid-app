import type { Lang, Localized } from '@mawalid/shared'

/* Der Titel in der Oberflächensprache, mit Rückfall. Reihenfolge: gewünschte
   Sprache, dann Englisch, dann Deutsch, dann Arabisch. Arabisch steht zuletzt,
   weil ein arabischer Titel an der Stelle eines lateinischen zwar richtig,
   aber unlesbar für jemanden ist, der die Oberfläche auf Deutsch führt. */
export function latin(loc: Localized, locale: string): string {
  const want = loc[locale as Lang]
  return want ?? loc.en ?? loc.de ?? loc.tr ?? loc.ar ?? ''
}

/* Der arabische Titel, wenn es einen gibt. Leer heißt: die Zeile entfällt —
   nicht: hier steht ein lateinischer Ersatz. Zwei lateinische Zeilen
   untereinander sähen aus wie ein Fehler, und das wären sie auch. */
export const arabic = (loc: Localized): string => loc.ar ?? ''
