/* Verstext in darstellbare Stücke zerlegen.
 *
 * Die Quelle trägt drei Auszeichnungen im Text selbst:
 *   ۞   Halbverstrenner — wird als Rosette gesetzt
 *   \n  harter Zeilenumbruch innerhalb des Verses
 *   ‖   Seitenumbruch des gedruckten Buches (nur die Buchansicht wertet ihn
 *       aus; in der Lese-Ansicht verschwindet er)
 *
 * Dazu kommen die Glossen: Regeln aus `text_annotations`, die Stellen im Text
 * in goldene Tinte setzen — Wiederholungszahlen, „der Ort des Aufstehens",
 * „so-und-so, Sohn von so-und-so".
 *
 * Warum Marken statt `v-html`: der Text kommt aus der Datenbank und wird
 * später über eine Redaktionsoberfläche bearbeitet. Ein `v-html` darauf wäre
 * die Stelle, an der ein eingefügtes `<script>` ausgeführt würde. Marken
 * lassen sich mit `v-for` setzen, und Vue entschärft dabei jedes Zeichen von
 * selbst.
 */

import type { Annotation, Localized } from '@mawalid/shared'

export const ROSETTE = '۞'
export const PAGE_BREAK = '‖'

export type Token =
  | { t: 'text'; s: string }
  | { t: 'rosette' }
  | { t: 'break' }
  | { t: 'gloss'; s: string; gloss: string }

type Range = { from: number; to: number; gloss: string }

const escapeLiteral = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/* Die Regeln der Reihe nach anwenden, aber niemals in eine schon gefundene
   Stelle hinein. Die alte App ersetzte nacheinander im HTML; dabei konnte eine
   spätere Regel in den Ersatz der früheren hineingreifen. Mit Bereichen kann
   das nicht passieren, und das Ergebnis ist bei den sieben vorhandenen Regeln
   dasselbe. */
function glossRanges(body: string, annotations: readonly Annotation[], locale: string): Range[] {
  const found: Range[] = []
  const taken = (from: number, to: number) => found.some((r) => from < r.to && to > r.from)

  for (const a of [...annotations].sort((x, y) => x.sortOrder - y.sortOrder)) {
    const gloss = pickGloss(a.glosses, locale)
    let re: RegExp
    try {
      re = new RegExp(a.matchKind === 'literal' ? escapeLiteral(a.pattern) : a.pattern, 'g')
    } catch {
      /* Eine Regel, die die Redaktion kaputt gespeichert hat, darf den Text
         nicht mitreißen. Sie wird übersprungen, der Vers erscheint ohne sie. */
      continue
    }
    for (const m of body.matchAll(re)) {
      if (m.index === undefined || m[0] === '') continue
      const from = m.index
      const to = from + m[0].length
      if (!taken(from, to)) found.push({ from, to, gloss })
    }
  }
  return found.sort((a, b) => a.from - b.from)
}

const pickGloss = (glosses: Localized, locale: string): string =>
  glosses[locale as keyof Localized] ?? glosses.de ?? glosses.en ?? ''

/* Zeichenkette → Marken. `stripPageBreak` ist für die Lese-Ansicht: dort ist
   der Buchumbruch bedeutungslos und würde als senkrechter Strich mitten im
   Satz erscheinen. */
export function tokenize(
  body: string,
  options: {
    annotations?: readonly Annotation[]
    locale?: string
    stripPageBreak?: boolean
    rosettes?: boolean
  } = {},
): Token[] {
  const { annotations = [], locale = 'de', stripPageBreak = true, rosettes = true } = options

  /* Der Seitenumbruch wird ENTFERNT, nicht durch ein Leerzeichen ersetzt: in
     der Quelle steht er zwischen zwei Wörtern, die im Buch durch den
     Seitenwechsel getrennt sind — das Leerzeichen daneben ist schon da. */
  const source = stripPageBreak ? body.split(PAGE_BREAK).join('') : body

  const ranges = glossRanges(source, annotations, locale)
  const out: Token[] = []

  const plain = (s: string) => {
    for (const [i, line] of s.split('\n').entries()) {
      if (i > 0) out.push({ t: 'break' })
      if (!rosettes) {
        if (line) out.push({ t: 'text', s: line })
        continue
      }
      for (const [j, part] of line.split(ROSETTE).entries()) {
        if (j > 0) out.push({ t: 'rosette' })
        if (part) out.push({ t: 'text', s: part })
      }
    }
  }

  let cursor = 0
  for (const r of ranges) {
    if (r.from > cursor) plain(source.slice(cursor, r.from))
    out.push({ t: 'gloss', s: source.slice(r.from, r.to), gloss: r.gloss })
    cursor = r.to
  }
  if (cursor < source.length) plain(source.slice(cursor))

  return out
}

/* ── Hervorhebungsabschnitte ────────────────────────────────────────────────
 *
 * Die Vorlage teilt einen Vers für Markierung und Treffer-Aufblitzen in
 * Abschnitte: an jeder Rosette ۞ (sie steht ZWISCHEN den Abschnitten) und an
 * jedem arabischen Komma ، (es bleibt AM Abschnitt). Die Zählung hier muss
 * mit segParts() in packages/shared/src/search-core.mjs übereinstimmen —
 * der Server rechnet den Treffer-Abschnitt damit aus, und `data-sg` ist die
 * Adresse, auf die er zeigt.
 *
 * Eine bewusste Ungenauigkeit: eine Glosse wird nicht am Komma geteilt (sie
 * ist ein eigenes, klickbares Element). Keine der sieben Glossenregeln des
 * Bestands enthält ein Komma; träfe es doch einmal zu, verschöbe sich die
 * Zählung dieses einen Verses und das Aufblitzen fiele auf den ganzen Vers
 * zurück — falsch markiert wird nichts.
 */

export type SegmentPiece = { sg: number | null; tokens: Token[] }

const SEG_COMMA = '،'

export function segmentTokens(tokens: readonly Token[], offset = 0): SegmentPiece[] {
  const pieces: SegmentPiece[] = []
  let current: Token[] = []
  let plain = ''
  let next = offset

  /* Abschluss eines Abschnitts: nur Inhalt, der nach trim() etwas trägt,
     bekommt eine Nummer — Weißraum zwischen zwei Rosetten zählt nicht,
     genau wie in segParts(). */
  const flush = () => {
    if (current.length === 0) return
    pieces.push({ sg: plain.trim() !== '' ? next++ : null, tokens: current })
    current = []
    plain = ''
  }

  for (const token of tokens) {
    if (token.t === 'rosette') {
      flush()
      pieces.push({ sg: null, tokens: [token] })
      continue
    }
    if (token.t === 'break') {
      current.push(token)
      plain += '\n'
      continue
    }
    if (token.t === 'gloss') {
      current.push(token)
      plain += token.s
      continue
    }
    /* Ein Textstück kann mehrere Kommata tragen; jedes schließt einen
       Abschnitt, das Komma selbst bleibt am Ende stehen. */
    const parts = token.s.split(SEG_COMMA)
    for (const [i, part] of parts.entries()) {
      const last = i === parts.length - 1
      const s = last ? part : part + SEG_COMMA
      if (s) {
        current.push({ t: 'text', s })
        plain += s
      }
      if (!last) flush()
    }
  }
  flush()
  return pieces
}

/* Die Basmala steht im Buch über dem Text, nicht in ihm. Erkannt wird sie ohne
   Vokalzeichen, damit jede Vokalisierung der Vorlage trifft — und sie muss die
   Basmala SEIN, nicht bloß mit ihr beginnen: sonst verschwände eine Sure, die
   mit ihr anfängt, als Ganzes in die Kopfzeile. */
export function isBasmala(arabic: string): boolean {
  /* Die Bereiche sind bewusst als \uXXXX geschrieben und nicht als Zeichen:
     eine Zeichenklasse mit arabischen Literalen zeigt im Editor durch die
     Bidi-Darstellung eine andere Reihenfolge als sie hat. Genau daran ist in
     Phase 2 eine Stunde draufgegangen. */
  const bare = String(arabic)
    .replace(/\u0671/g, '\u0627') // Alif Wasla -> Alif
    .replace(/[\u064B-\u0655\u0670\u06D6-\u06ED\s]/g, '') // Vokale, Quranzeichen
  return (
    bare ===
    '\u0628\u0633\u0645\u0627\u0644\u0644\u0647\u0627\u0644\u0631\u062D\u0645\u0646\u0627\u0644\u0631\u062D\u064A\u0645'
  )
}

/* Die Basmala aus einem Vers herausheben, damit sie auf einer eigenen Zeile
   über dem übrigen Text steht statt in ihn hineinzulaufen. Sie kann nach der
   Taʿawwudh stehen, deshalb wird an den Rosetten getrennt und gesucht.
   Ergibt null, wenn der Vers keine enthält.

   Das `trim()` hier ist eine DARSTELLUNGSSACHE und berührt den gespeicherten
   Text nicht: die Teile werden nur zum Setzen neu zusammengefügt, so wie es
   die Vorlage tut. In die Datenbank fließt davon nichts zurück. */
export function splitBasmala(body: string): { pre: string; basmala: string; rest: string } | null {
  const parts = String(body)
    .split(ROSETTE)
    .map((s) => s.trim())
    .filter(Boolean)
  const at = parts.findIndex(isBasmala)
  if (at === -1) return null
  return {
    pre: parts.slice(0, at).join(` ${ROSETTE} `),
    basmala: parts[at] ?? '',
    rest: parts.slice(at + 1).join(` ${ROSETTE} `),
  }
}
