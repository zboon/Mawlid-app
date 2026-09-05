/* Aus Folio-Angaben werden Blätter.
 *
 * Der entscheidende Punkt, an dem ein Neuaufbau scheitert: die Seitengrenzen
 * stehen NICHT in den Folio-Angaben. Von 31 Werken mit Folios haben 26 genau
 * eines, das das ganze Kapitel umfasst. Der tatsächliche Umbruch ist das
 * Zeichen ‖ (U+2016) IM VERSTEXT — 226 Mal im Bestand. Aus 46 Folio-Einträgen
 * werden so 272 Blätter. Wer nur die Folios auswertet, bekommt 46 sehr volle
 * Seiten statt eines Buches.
 *
 * Portiert aus `manuscriptPages()` der alten App, Verhalten für Verhalten.
 */

import { segParts, type Verse, type WorkDetail } from '@mawalid/shared'
import { PAGE_BREAK, isBasmala } from './text'

export interface LeafItem {
  verse: Verse
  /* Der Abschnitt des Originaltextes, der auf DIESES Blatt gehört. Bei einem
     ungeteilten Vers ist das der ganze Text. */
  body: string
  /* Bei geteilten Versen die laufende Nummer des Abschnitts, sonst null. Sie
     hält Markierungen auseinander: wer einen Abschnitt markiert, markiert
     nicht jedes Blatt, auf das der Vers überläuft. */
  sub: number | null
  /* Der Abschnitt endet mitten im Vers — dann bekommt er KEINE Rosette. Das
     gedruckte Buch setzt auch keine, wo ein Satz nur auf die nächste Seite
     weiterläuft. */
  cont: boolean
  bandBefore: string | null
  isBasmala: boolean
  /* Wo die Abschnittszählung (۞/،, siehe segmentTokens in lib/text.ts) für
     diesen Teil beginnt: die Summe der Abschnitte aller früheren Teile
     desselben Verses. Gezählt auf dem ANZEIGETEXT — in Bereichen, deren
     Buchansicht die Kommata weglässt, weicht die Zählung damit vom
     Servertreffer ab; das Aufblitzen fällt dort auf den ganzen Vers zurück. */
  segBase: number
}

export interface Leaf {
  band: string | null
  short: boolean
  items: LeafItem[]
}

/* Die Buchansicht setzt keine Kommata — das Manuskript kennt sie nicht.
 * Ausnahme sind die Dalāʾil und die Aḥzāb: das sind lange, ununterbrochene
 * Litaneien, und die Kommata sind das, woran man beim Mitlesen die Stelle
 * wiederfindet. In der alten App hing das an den Kürzeln 'd' und 'l'.
 *
 * Das ist eine INHALTLICHE Einstellung und gehört auf Dauer als Spalte an
 * `modules`, nicht hierher. Sie steht so lange an dieser einen benannten
 * Stelle, bis die Redaktionsoberfläche sie setzen kann (Phase 6).
 */
const MODULES_KEEPING_COMMAS = new Set(['dalail', 'ahzab'])

const displayBody = (body: string, moduleSlug: string): string =>
  MODULES_KEEPING_COMMAS.has(moduleSlug) ? body : body.replace(/\s*،\s*/g, ' ')

export function buildLeaves(work: WorkDetail): Leaf[] {
  const byPosition = new Map(work.verses.map((v) => [v.position, v]))
  const leaves: Leaf[] = []

  const folios = work.folios.length
    ? work.folios
    : /* Kein Folio-Eintrag: das ganze Werk ist ein Blatt. Kommt bei den
         Werken vor, die gar keine Buchansicht anbieten — die Funktion soll
         trotzdem etwas Sinnvolles liefern, statt leer auszugehen. */
      [{ position: 0, from: 0, to: work.verses.length - 1, hasSections: false, bandLabel: null }]

  for (const folio of folios) {
    let items: LeafItem[] = []
    let band = folio.bandLabel
    let shortNext = false

    const flush = () => {
      if (items.length === 0) return
      leaves.push({ band, items, short: shortNext })
      band = null
      items = []
      shortNext = false
    }

    for (let position = folio.from; position <= folio.to; position += 1) {
      const verse = byPosition.get(position)
      if (!verse) continue
      const original = verse.texts.original?.body ?? ''
      const body = displayBody(original, work.module.slug)

      /* Ein Blatt, das das Buch selbst halb leer lässt (ein Abschnitt beginnt
         erst auf der nächsten Seite). Die Höhenanpassung lässt es kurz, statt
         die Schrift bis zum Rand aufzublasen. */
      if (verse.shortPage) shortNext = true

      if (isBasmala(body)) {
        items.push({
          verse,
          body,
          sub: null,
          cont: false,
          bandBefore: verse.bandLabel,
          isBasmala: true,
          segBase: 0,
        })
        continue
      }

      if (!body.includes(PAGE_BREAK)) {
        items.push({
          verse,
          body,
          sub: null,
          cont: false,
          bandBefore: verse.bandLabel,
          isBasmala: false,
          segBase: 0,
        })
        continue
      }

      const chunks = body.split(PAGE_BREAK).map((s) => s.trim())
      const nonEmpty = chunks.filter(Boolean)
      const multi = nonEmpty.length > 1
      /* Die Rosette markiert das ENDE des Verses, also trägt sie nur der
         letzte nicht-leere Abschnitt. */
      let lastFilled = -1
      chunks.forEach((c, i) => {
        if (c) lastFilled = i
      })

      let sub = 0
      let segBase = 0
      chunks.forEach((chunk, i) => {
        if (chunk) {
          items.push({
            verse,
            body: chunk,
            sub: multi ? sub++ : null,
            cont: i < lastFilled,
            bandBefore: i === 0 ? verse.bandLabel : null,
            isBasmala: false,
            segBase,
          })
          segBase += segParts(chunk).length
        }
        /* Zwischen Abschnitt i und i+1 steht ein Umbruchzeichen — auch wenn
           ein Abschnitt leer ist (ein ‖ ganz am Ende eines Verses). Jedes
           Zeichen wendet das Blatt. */
        if (i < chunks.length - 1) flush()
      })
    }

    flush()
  }

  return leaves
}

/* Die Kopfzeile, die auf jedem Blatt wiederkehrt. */
export const runningHead = (work: Pick<WorkDetail, 'cartouche' | 'titles'>): string =>
  work.cartouche ?? work.titles.ar ?? ''

/* Für die Lese-Ansicht: der Vers ohne die Buchumbrüche. */
export const studyBody = (verse: Verse): string => verse.texts.original?.body ?? ''
