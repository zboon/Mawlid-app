# Migration der Inhalte

Wie 111 Werke mit 2.512 Versen aus `index.html` in die Datenbank kommen —
ohne dass ein einziges Harakat verloren geht.

Das ist der Teil des Projekts mit dem höchsten Risiko und der geringsten
Fehlertoleranz. Handvokalisierter arabischer Text ist unersetzlich; ein still
verschluckter Codepoint fällt erst auf, wenn jemand beim Rezitieren stolpert.

---

## 1 · Der Weg

```
index.html
   │
   │  tools/extract-content.mjs      ✅ fertig und lauffähig
   ▼
data/extracted/*.json                 rohe Arrays, 1:1
   │
   │  tools/build-seed.mjs            normalisiert und ordnet zu
   ▼
db/seed/*.json                        in Schema-Form
   │
   │  npm run db:seed                 schreibt in MySQL
   ▼
MySQL
   │
   │  tools/verify-migration.mjs      vergleicht zurück gegen die Quelle
   ▼
Prüfbericht
```

**Kein Schritt ist manuell.** Jeder ist wiederholbar, jeder ist prüfbar. Wenn
sich die alte App noch einmal ändert, läuft die Kette neu.

---

## 2 · Schritt 1 — Extraktion (fertig)

```bash
node tools/extract-content.mjs
# Extracted 28 declarations → data/extracted
#   content : 111 works, 2512 verses
#   nav     : 38 entries across 7 constants
# NOTE: NASHEED_CHAPTERS is empty.
```

Das Werkzeug schneidet die gewünschten Deklarationen per Klammerbalancierung aus
dem `<script>`-Block und wertet **nur diese** in einem isolierten
`vm`-Kontext aus. Es führt die App nicht aus — die fasst beim Laden das DOM an.

Fehlt eine Deklaration (umbenannt, gelöscht), sagt es das laut, statt still alte
Daten zu liefern.

Nebenbei entsteht `data/extracted/_manifest.json` mit Anzahl, Feldern und
Versummen je Array. Diese Datei ist der Vergleichspunkt für Schritt 4.

---

## 3 · Schritt 2 — Zuordnung

Hier steckt die eigentliche Arbeit: aus flachen Arrays wird eine Struktur.

### 3.1 Module und Sammlungen

Sie existieren heute nicht als Daten, sondern als vier Konstanten
(`HOME_CARDS`, `TABS`, `MAWLID_COLLECTIONS`, `PRAISE_SECTIONS`) plus die
Verzweigungsleiter in `renderResults()`. Sie werden von Hand definiert — einmal,
in einer Zuordnungsdatei:

| Modul | Ansichtstyp | Sammlungen | Quelle |
|---|---|---|---|
| `mawlid` | recitation | Daybaʿī, Barzanjī, Ḍiyāʾ, Burdah | `QASIDAS`+`SIRAH`, `BARZANJI`, `DIYA`, `BURDAH` |
| `dalail` | recitation | Wochenteile, Vor der Lesung, Nach Abschluss | `DALAIL_CHAPTERS` |
| `ahzab` | recitation | Al-Ḥizb al-Aʿẓam, Ḥizb al-Istighfār, Einzelne | `LITANY_CHAPTERS` |
| `praises` | recitation | Qasidas, Ilahis, Nasheeds, Qawwalis | `QASIDAS` (ohne Nummer), `ILAHI`, — , — |
| `silsila` | tree | — | **neu, leer** |
| `sohbets` | article | — | **neu, leer** |
| `ottoman` | article | — | **neu, leer** |
| `wiki` | wiki | — | **neu, leer** |

> **Die Sammlung `ahzab` bekommt einen eigenen Platz auf der Startseite.** Sie
> ist heute unerreichbar (Befund B1) — 950 Verse, die niemand sieht. Bei der
> Migration ist das eine Einzeile; sie jetzt nicht zu setzen hieße, den Fehler
> mitzunehmen.

### 3.2 Werke

Jedes Kapitel/Stück wird ein `works`-Datensatz.

**Slug-Bildung:** aus dem englischen Titel, ohne die Nummernvorsilbe, in
Kleinbuchstaben, diakritikafrei, Bindestriche:

```
"13 · Yā Nabī Salām ʿAlayka — Mawlid version"
  → "ya-nabi-salam-alayka-mawlid-version"
```

Kollisionen bekommen ein Suffix `-2`. Der Slug ist ab dann **stabil** und wird
nie wieder aus dem Titel neu erzeugt — sonst ändert eine Titelkorrektur die URL.

**Feldzuordnung:**

| Quelle | Ziel |
|---|---|
| `titleArabic` | `work_translations(lang='ar').title` |
| `titleEnglish` ohne Nummernvorsilbe | `work_translations(lang='en').title` |
| `note` | `work_translations(lang='en').note` |
| `cartouche` | `works.cartouche` |
| `latin: true` | `works.primary_script='latn'`, `primary_lang='tr'` |
| *(sonst)* | `primary_script='arab'`, `primary_lang='ar'` |
| `folios` vorhanden | `works.has_folios = 1` |

### 3.3 Lesereihenfolge des Mawlid

Der heikelste Punkt, weil die Ordnung aus einer Zeichenkette kommt:

```js
const SECTION_RE = /^(\d+)(b?)\s*·\s*(.*)$/;
// num = +m[1] + (m[2] ? 0.5 : 0)
```

**Vorgehen:**

1. Aus `QASIDAS` **und** `SIRAH_CHAPTERS` alle Stücke mit Nummer sammeln.
2. Nach `num` sortieren (`13b` = 13,5 landet zwischen 13 und 14).
3. Von 1 an durchnummerieren → `sequence_items.ordinal`.
4. Die ursprüngliche Kennung („13", „13b") als `source_label` mitschreiben.
5. Stücke **ohne** Nummer sind kein Teil des Mawlid → sie gehören in die
   Sammlung „Qasidas" unter `praises`.

**Prüfung:** Die entstehende Liste muss Stück für Stück dieselbe Reihenfolge
haben wie `mawlidItems()` in der alten App. Das prüft Schritt 4 automatisch.

### 3.4 Verse

```js
// Quelle
{ ar: "…۞…", tr: "…", en: "…", refrain: true }
```

wird zu einer Zeile in `verses` plus bis zu drei in `verse_texts`.

**`position`** ist der Array-Index. Er bleibt erhalten, weil `folios` darauf
zeigt und weil die alten `mawlid-marks`-Schlüssel ihn enthalten.

**Typ ableiten:**

```
instruction === true  →  verse_kind = 'instruction'
refrain     === true  →  verse_kind = 'refrain'
sonst                 →  verse_kind = 'verse'
```

Beide gleichzeitig kommt in den Daten nicht vor. Sollte es doch auftauchen,
**bricht der Import ab** — nicht raten.

**Texte:**

| Bedingung | lang | role | script |
|---|---|---|---|
| `ar` gesetzt, Werk arabisch | `ar` | `original` | `arab` |
| `ar` gesetzt, Werk `latin` | `tr` | `original` | `latn` |
| `tr` nicht leer | `ar` | `transliteration` | `latn` |
| `en` nicht leer | `en` | `translation` | `latn` |

Leere Zeichenketten werden **nicht** als Zeile angelegt. Sonst hat der halbe
Bestand leere Übersetzungssätze, und das Admin-Formular kann nicht mehr
unterscheiden zwischen „nicht übersetzt" und „absichtlich leer".

### 3.5 Textinhalt — was **nicht** angefasst wird

Der Inhalt von `body` wird **byteweise übernommen**. Insbesondere:

| Zeichen | | Warum es bleiben muss |
|---|---|---|
| `۞` | U+06DE | Halbverstrenner. Steuert die Rosette **und** die Segmentgrenzen fürs Antippen und Markieren. |
| `‖` | U+2016 | Weicher Trenner. Wird bei der Anzeige entfernt, ist aber Umbruchinformation für die Manuskriptansicht. |
| `\n` | | Harter Zeilenumbruch im Vers. |
| `،` | U+060C | Arabisches Komma. Trennt ebenfalls Segmente. |
| `ﷺ` | U+FDFA | Ligatur, kein Ornament. |
| `ٱ` | U+0671 | Alif Wasla. Nicht mit `ا` verwechseln. |
| Alle Harakāt | U+064B–U+0652, U+0670 | Bedeutungstragend. |

**Verboten beim Import:** Unicode-Normalisierung (NFC/NFD), Trimmen,
Leerzeichen zusammenziehen, „Aufräumen" von Satzzeichen, Konvertieren von
Anführungszeichen.

Die einzige berechnete Ableitung ist `body_search` — und die steht in einer
**anderen Spalte**.

> **Gleiche Verse werden nicht zusammengefasst.** In den Istighfār-Portionen
> steht dieselbe Zeichenkette rund sechzig Mal. Das ist kein Duplikat, sondern
> eine sechzigfache Wiederholung, die auch sechzig Mal gelesen wird. Ein
> Importer, der „aufräumt", zerstört den Text.

### 3.5b Die Auszeichnungen innerhalb des Textes

Zwei Dinge stecken **im Text**, nicht neben ihm, und werden leicht übersehen:

**1 · `‖` (U+2016) ist ein Seitenumbruch im Buchmodus.** Die Manuskriptansicht
teilt einen langen Vers an diesem Zeichen in *Abschnitte* und verteilt sie auf
mehrere Blätter. Deshalb haben die alten Markierungsschlüssel eine Unterstufe:

```
"d:6:12:0"     Vers 12, Segment 0
"d:7:129.1:2"  Vers 129, ZWEITER Abschnitt (nach dem ‖), Segment 2
```

Das Zeichen wird vor der Anzeige entfernt (`stripBreaks`), muss aber in der
Datenbank stehen bleiben — sonst verliert die Buchansicht ihre feineren
Umbrüche.

**2 · `INLINE_INSTRUCTIONS` — redaktionelle Glossen.** Eine Liste von
Such-und-Ersetz-Regeln, die beim Rendern bestimmte Stellen in goldene Tinte
hüllt und nachbildet, was das gedruckte Buch farbig setzt:

| Muster | Bedeutung |
|---|---|
| `(3)`, `(١٤)`, `(٤ مرات)` | Wiederholungszahlen |
| `(محل الْقيام)` | die Stelle des Aufstehens |
| `(فُلَانِ بْن فُلَانٍ)` | „so-und-so, Sohn von so-und-so" — hier den eigenen Namen einsetzen. Trägt zusätzlich eine englische Erklärung, die beim Antippen erscheint |
| zwei längere Einschübe | editorische Anmerkungen aus al-Ḥizb al-Aʿẓam und Ḥizb al-Istighfār, im Druck in farbiger Tinte |

**Das ist Inhalt, keine Formatierung**, und es verschwindet lautlos, wenn man es
übersieht: der Text erscheint weiterhin, nur ohne Auszeichnung. Deshalb wandert
es in die Tabellen `text_annotations` und `text_annotation_translations` statt in
eine Konstante im Quelltext.

### 3.6 Folios, Medien, Zeitpläne

**Folios:** `[{from, to, sections?, band?}]` → eine Zeile je Eintrag, `position`
ist der Index.

> Erwarte dabei nicht viel: von 31 Werken mit Folios haben **26 genau eines**,
> das das ganze Kapitel umfasst. Die Folio-Tabelle bleibt trotzdem richtig — sie
> ist die redaktionelle Stelle, an der Blattgrenzen künftig gepflegt werden —
> aber der heutige Seitenumbruch steckt zum größten Teil im `‖` im Verstext
> (siehe 3.5b). Wer beim Import nur die Folios beachtet, verliert 226
> Seitengrenzen, ohne dass etwas fehlschlägt.

**Medien:**

| Quelle | Ziel |
|---|---|
| `video` | `media(kind='video', provider='youtube', sort_order=0)` |
| `video2` | `media(… sort_order=1, label='Alternative Version')` |
| `videoStart`/`videoEnd` | `start_seconds` / `end_seconds` |
| `DALAIL_AUDIO[idx]` | `media(kind='audio', provider='file')`, `url = AUDIO_BASE + file`, `duration_seconds = secs` |
| `RECITERS` | Tabelle `reciters` |

**Zeitpläne:** Die drei Konstanten `DALAIL_TODAY_IDX`, `AZAM_TODAY_IDX`,
`ISTIGHFAR_TODAY_IDX` werden zu drei `schedules` mit je sieben oder acht
`schedule_slots`. Der Array-Index wird dabei zur `work_id` aufgelöst — **das ist
der Moment, in dem die fragile Kopplung endgültig verschwindet.**

---

## 4 · Schritt 3 — Import

```bash
npm run db:seed
```

Läuft in **einer Transaktion**. Bricht irgendetwas ab, ist die Datenbank
unverändert. Der Import ist **idempotent**: er löscht die Inhaltstabellen und
schreibt neu — persönliche Daten (Favoriten, Lesepositionen) und Benutzer bleiben
unberührt.

Reihenfolge wegen der Fremdschlüssel: `languages` → `modules` → `collections` →
`works` → `verses` → `verse_texts` → `folios` → `media` → `reciters` →
`schedules` → `sequences`.

---

## 5 · Schritt 4 — Prüfung

**Ein Import ohne automatische Gegenprüfung ist nicht fertig.**
`tools/verify-migration.mjs` liest die Datenbank zurück und vergleicht sie gegen
`data/extracted/`. Es prüft:

### Vollständigkeit

- [ ] `works`-Anzahl = 111
- [ ] `verses`-Anzahl = 2.512
- [ ] Je Werk: Versanzahl stimmt mit dem Quellarray überein
- [ ] Kein Werk ohne Titel in mindestens einer Sprache

### Zeichentreue — die wichtigste Prüfung

- [ ] Für **jeden** Vers: `body` aus der Datenbank ist **bytegleich** mit dem
      Quellfeld. Kein Vergleich nach Normalisierung, kein `trim()`.
- [ ] Die Zahl der `۞`-Zeichen je Vers stimmt überein
- [ ] Die Zahl der `‖`-Zeichen je Vers stimmt überein
- [ ] Die Zahl der `\n` je Vers stimmt überein
- [ ] Prüfsumme über alle arabischen Texte, Quelle vs. Datenbank

```js
// Der Kern der Prüfung — keine Toleranz.
if (dbBody !== srcBody) {
  report.push({ work: w.slug, verse: v.position,
                srcLen: srcBody.length, dbLen: dbBody.length,
                firstDiff: firstDifferingIndex(srcBody, dbBody) });
}
```

### Struktur

- [ ] Folio-Bereiche decken jeden Vers genau einmal ab, keine Lücke, keine
      Überschneidung
- [ ] **226 `‖`-Zeichen** im Bestand, Quelle und Datenbank gleich viele
- [ ] Aus 46 Folio-Einträgen entstehen **272 Blätter** — die Buchansicht der
      neuen App muss auf dieselbe Zahl kommen
- [ ] `collections.book_keeps_commas` ist für Dalāʾil und Aḥzāb gesetzt, sonst nicht
- [ ] Jeder `schedule_slot` zeigt auf das Werk, das die alte
      `*_TODAY_IDX`-Tabelle für diesen Wochentag ergab
- [ ] Die `sequence_items`-Reihenfolge ist identisch mit `mawlidItems()`
- [ ] Jedes Werk mit `has_folios` hat mindestens ein Folio

### Suchgleichheit

- [ ] Für eine feste Liste von 40 Suchbegriffen (arabisch, Umschrift, englisch,
      mit Tippfehlern) liefert die neue Suche **dieselbe Menge Werke** wie die
      alte.

Das ist die anspruchsvollste Prüfung und die wertvollste: sie beweist, dass die
Normalisierung wirklich übernommen wurde und nicht nur ungefähr.

**Der Bericht wird archiviert.** Er ist der Beleg dafür, dass nichts verloren
ging.

---

## 6 · Was bei der Migration bewusst repariert wird

Nicht alles wird 1:1 übernommen. Diese Punkte sind Fehler und werden beim
Übertragen behoben (Belege in `docs/analysis/befunde.md`):

| # | Was | Wie |
|---|---|---|
| B1 | Al-Aḥzāb (950 Verse) unerreichbar | Eigenes Modul mit Startseiten-Kachel und in der Suche |
| B2 | Verwaister CSS-Block macht `.v-note` und `.verse.v-instruction` unwirksam | Beide Komponenten korrekt neu gebaut |
| B3 | Sternenband ignoriert den Dunkelmodus | Inline-SVG mit Tokens |
| B4 | Rosetten-Goldtöne zwischen den Themen vertauscht | Korrigiert, besser: `currentColor` |
| B5 | Zurück-Knopf verliert die Suche bei 8 von 9 Textarten | Router-Verlauf, einheitlich |
| B7c | Rezitatoren-Auswahl wird gelesen, nie geschrieben | Auswahl bauen oder Feld entfernen |
| B7h | Verwaiste Favoriten werden nie aufgeräumt | Fremdschlüssel — kann nicht mehr passieren |
| — | Anzeigeeinstellungen gehen beim Neuladen verloren | `showTr`, `showEn`, `arScale`, `latinScale`, `pageView`, Scrollgeschwindigkeit werden gespeichert |

**Nicht** repariert wird alles, was Inhalt betrifft. Ein fehlendes Barzanjī-Kapitel
bleibt fehlend; der Import erfindet nichts.

---

## 7 · Vor der Migration zu entscheiden

Diese Fragen kann nur der Inhaber beantworten:

1. **Barzanjī** — 17 Kapitel, davon 16 leer. Sollen die leeren Kapitel als
   Platzhalter mitwandern (dann in der Oberfläche als „in Arbeit" kennzeichnen),
   oder wird nur das eine gefüllte importiert?
   *Entschieden (Phase 3, Treue-Runde): alle 17 veröffentlicht, wie in der
   Vorlage — leere Kapitel öffnen eine Platzhalterseite. Rückweg: UPDATE auf
   `status='draft'`, die API blendet Entwürfe von selbst aus.*

2. **Nasheeds und Qawwalis** — beide vollständig leer. Als Module anlegen und
   ausgeblendet lassen (`is_published = 0`), oder erst dann, wenn es Inhalt gibt?
   *Empfehlung: anlegen, unveröffentlicht — dann steht die Struktur.*

3. **Die zwei Litanei-Titelplätze** (`LITANY_CHAPTERS[2]` und `[3]`) sind reine
   Namensträger ohne Verse. Sie werden zu **Sammlungen**, nicht zu Werken.
   *Das ist eine Verbesserung — bitte gegenlesen.*

4. **Deutsche Übersetzungen** — es gibt heute keine. Das Schema hält den Platz
   frei. Wann soll übersetzt werden, und von wem?

5. **Der Feedback-Empfänger** (`FEEDBACK_EMAIL`) steht im Quelltext. Soll er in
   die Konfiguration wandern oder ganz durch das Korrekturformular ersetzt
   werden?

6. **Die Kommaregel der Buchansicht** (kam in Phase 3 dazu). Das Manuskript
   setzt keine Kommata — außer in den Dalāʾil und den Aḥzāb, wo sie ausdrücklich
   gewünscht waren, weil diese Texte lange ununterbrochene Litaneien sind. In
   der alten App hing das an den Kürzeln `d` und `l`; heute steht es als
   benannte Konstante `MODULES_KEEPING_COMMAS` in
   `apps/web/src/lib/pages.ts`. Das ist eine **inhaltliche** Einstellung und
   gehört als Spalte an `modules`, sobald die Redaktionsoberfläche sie setzen
   kann. *Empfehlung: bei Phase 6 mitnehmen, nicht vorher — ein Schemawechsel
   zwingt heute zum erneuten Laden und Gegenprüfen des ganzen Bestandes.*

7. **Die 16 leeren Werke** waren zunächst als `draft` importiert und damit
   unsichtbar. *In der Treue-Runde umgestellt: veröffentlicht, wie in der
   Vorlage (siehe Frage 1). Die Anweisung „alles wie das Original" hat
   entschieden.*

---

## 8 · Die alte App während der Migration

Sie bleibt **unverändert lauffähig**. `index.html`, `sw.js` und `manifest.json`
werden nicht angefasst.

Erst wenn die neue App den Alltag trägt, wird entschieden, ob die alte
abgeschaltet wird oder als Offline-Notfallkopie bestehen bleibt.

> Angesichts von ADR-004 (online-first) ist Zweites ernsthaft zu erwägen: die
> alte App ist derzeit die einzige Fassung, die in einer Moschee ohne Netz
> funktioniert. Sie einzumotten kostet nichts.
