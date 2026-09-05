import { describe, expect, it } from 'vitest'
import { segParts } from '@mawalid/shared'
import { segmentTokens, tokenize, type Token } from './text'

/* Die Abschnittszählung der Oberfläche (data-sg) MUSS mit segParts() im
 * geteilten Suchkern übereinstimmen: der Server rechnet den
 * Treffer-Abschnitt damit aus, und das Aufblitzen adressiert data-sg.
 * Läuft die Zählung auseinander, blitzt die falsche Stelle — ohne
 * Fehlermeldung, nur falsch. Deshalb hier: dieselben Texte durch beide
 * Wege, Ergebnis deckungsgleich. */

const textOf = (tokens: readonly Token[]): string =>
  tokens.map((t) => (t.t === 'break' ? '\n' : t.t === 'rosette' ? '' : t.s)).join('')

const CASES = [
  'اَلْحَمْدُ لِلّٰهِ ۞ رَبِّ الْعَالَمِينَ',
  'اللهم صل على محمد، وعلى آل محمد، وبارك وسلم',
  'أوله ۞ ۞ آخره',
  '۞ يبدأ بالفاصل',
  'سطر أول\nسطر ثان، بعده ۞ تتمة',
  'نص بلا فواصل',
  'قبل ۞   ۞ بعد',
  'ولا تنس الحرف الأخير،',
]

describe('segmentTokens zählt wie segParts', () => {
  for (const body of CASES) {
    it(JSON.stringify(body.slice(0, 28)), () => {
      const pieces = segmentTokens(tokenize(body))
      const numbered = pieces.filter((p) => p.sg !== null)

      const expected = segParts(body)
      expect(numbered.map((p) => textOf(p.tokens))).toEqual(expected)
      expect(numbered.map((p) => p.sg)).toEqual(expected.map((_, i) => i))
    })
  }

  it('zählt ab dem Versatz weiter (geteilte Verse)', () => {
    const pieces = segmentTokens(tokenize('واحد، اثنان ۞ ثلاثة'), 5)
    expect(pieces.filter((p) => p.sg !== null).map((p) => p.sg)).toEqual([5, 6, 7])
  })

  it('der Seitenumbruch ‖ verschiebt die Zählung nicht', () => {
    /* In der Lese-Ansicht wird ‖ entfernt; segParts läuft beim Server über
       stripBreaks (‖ → Leerzeichen). Beide Formen müssen dieselben
       Abschnitte ergeben — nur so zeigt ein Buchtreffer auch in der
       Lesefassung auf die richtige Stelle. */
    const raw = 'أول الكلام ‖ تتمته، ثم ۞ الخاتمة'
    const stripped = raw.replace(/\s*‖\s*/g, ' ')
    const pieces = segmentTokens(tokenize(raw, { stripPageBreak: true }))
    expect(pieces.filter((p) => p.sg !== null).length).toEqual(segParts(stripped).length)
  })
})
