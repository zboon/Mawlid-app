# Befunde aus der Analyse der bestehenden App

Was bei der Untersuchung von `index.html` (16.155 Zeilen, 2,4 MB) herausgekommen
ist. Der erste Abschnitt sind **echte Fehler in der laufenden App** — die sind
unabhängig vom Neuaufbau interessant, weil sie sich heute beheben lassen.

Alle Zeilennummern beziehen sich auf `index.html`, Stand `v379`.

---

## Teil 1 — Fehler in der aktuellen App

### 🔴 B1 · Ein ganzer Bereich ist unerreichbar: Al-Aḥzāb (950 Verse)

**Das ist der schwerwiegendste Fund.** 18 Kapitel mit 950 Versen — knapp
**38 % des gesamten Textbestandes der App** — sind über die Oberfläche nicht
zu erreichen.

Der Tab `litanies` existiert und funktioniert vollständig. `litanyCards()`,
`openLitany()`, `azamIndex()`, `istighfarIndex()`, die Wochentagslogik, die
Zählwerte — alles ist da und korrekt. Nur führt kein Weg hin:

- `litanies` steht nicht in `TABS`, nicht in `HOME_CARDS`, nicht in
  `MAWLID_COLLECTIONS`, nicht in `PRAISE_SECTIONS`.
- Der Dalāʾil-Index (`dalailIndex()`) hat keine Zeile dafür.
- Das **einzige** `selectTab('litanies')` in der ganzen Datei steht in
  `backToLitanies()` — und das wird nur auf den Bildschirmen `azam` und
  `istighfar` gerendert, die ihrerseits nur von `litanies` aus erreichbar sind.
  Eine geschlossene Schleife ohne Eingang.
- Auch die Suche findet nichts davon: in der globalen Suchzusammenstellung
  (Zeile 11666 ff.) fehlt `litanyCards()` als einzige der neun Sammlungen.

Es gibt sogar noch das CSS für den Eingang: `.dalail-litanies` — eine
vollbreite Kachelvariante, die unter der Dalāʾil-Teileliste angeheftet werden
sollte. Der Code, der sie ausgibt, existiert nicht mehr. Und der Kommentar an
Zeile 11446 spricht von „der Al-Aḥzāb-Zeile", die es nicht mehr gibt.

**Bewertung:** Das sieht nach einer versehentlichen Regression aus, nicht nach
einer Entfernung mit Absicht. Jemand hat eine Zeile aus dem Dalāʾil-Index
genommen und die Tür damit zugemauert.

**Sofortmaßnahme in der alten App** (zwei Zeilen):

```js
// in dalailIndex(), bei den übrigen .dk-nav-Zeilen:
const litanies = navRow("selectTab('litanies')", 'The Daily Litanies', 'الْأَحْزَابُ');

// in renderResults(), im Suchzweig:
const lit = litanyCards();
if (lit) html += label('Al-Aḥzāb · الْأَحْزَاب', !!mawlid || !!barz || !!burd) + lit;
```

---

### 🔴 B2 · Verwaister CSS-Block macht zwei Regeln unwirksam

`index.html:886–892`:

```css
.dalail-litanies .home-card{ width:100%; }
    font-family:'Crimson Pro',serif; font-size:.82rem; letter-spacing:.03em;
    color:var(--accent-green); opacity:.9; margin-bottom:.35rem;
    text-align:center;
  }
  /* Instruction / rubric verses … */
  .verse.v-instruction{ … }
```

Zwischen Zeile 888 und 889 fehlt ein Selektor. Vermutlich stand dort
`.v-note{`, und beim Löschen ist nur die Selektorzeile mitgegangen.

**Zwei Folgen, beide sichtbar:**

1. **`.v-note` hat überhaupt kein Styling.** Der Code gibt es weiterhin aus
   (Zeile 13557: `<div class="v-note">${v.note}</div>`) — die Beschriftungen
   wie „Sūrat al-Ikhlāṣ" erscheinen also in Standardgröße und Standardfarbe
   statt als kleine grüne Kapitälchen.

2. **`.verse.v-instruction` greift ebenfalls nicht.** Der CSS-Parser sucht
   nach dem ersten `{` und zieht dabei alle verwaisten Zeilen *und* die
   nachfolgende Regel in einen einzigen, ungültigen Selektor. Die gesamte
   Regel wird verworfen. Rubrik-Verse verlieren dadurch ihren goldenen Rahmen
   und die Goldlasur; nur die Kindregeln (`.v-instruction .v-ar` usw.) greifen
   noch, weil sie danach stehen.

**Fix:** Selektor ergänzen:

```css
  .v-note{
    font-family:'Crimson Pro',serif; font-size:.82rem; letter-spacing:.03em;
    color:var(--accent-green); opacity:.9; margin-bottom:.35rem;
    text-align:center;
  }
```

---

### 🟠 B3 · Das Sternenband folgt dem Dunkelmodus nicht

Die drei Tokens `--star-fill`, `--band-field` und `--star-stroke` sind in beiden
Themen definiert — und werden von **keiner einzigen CSS-Regel gelesen**. Das
Sternenband ist stattdessen ein Inline-SVG mit fest eingetragenem `#B8934A`
(Zeile 1613). Es bleibt im Dunkelmodus hellgold.

Zusatzbefund: die Konstante `STAR` wird **überhaupt nicht benutzt**, ebenso
`CORNER_MOTIF`. Beide sind Ornamente, die es einmal gab und die
zurückgeblieben sind.

---

### 🟠 B4 · Die Goldtöne der Rosette sind zwischen den Themen vertauscht

Die Rosette ۞ wird durch ein Hintergrundbild ersetzt, mit einer zweiten Fassung
für den Dunkelmodus (nötig, weil ein data-URI-SVG keine CSS-Variablen lesen
kann). Dabei benutzt das **helle** Bild `#C9A55E` — das Dunkelmodus-Gold — und
das **dunkle** `#B8934A`, das Hell-Gold. Vertauscht.

Sichtbar ist das kaum, aber es ist der Grund, warum die Rosette in beiden
Themen einen Tick neben dem übrigen Gold liegt.

---

### 🟠 B5 · Der Zurück-Knopf verhält sich je nach Textart unterschiedlich

`openQasida()` benutzt beim Zurückgehen `renderIndex()` und erhält damit die
Suchanfrage. Die acht anderen Öffner benutzen `selectTab(…)`, was
`state.query` löscht.

Praktisch heißt das: sucht man nach einem Wort, öffnet einen Treffer und geht
zurück, ist die Suche noch da — außer bei acht von neun Textarten, wo sie weg
ist und man von vorn tippen muss.

---

### 🟡 B6 · Unbekannter Bereich zeigt die Favoritenzahl

`sectionCount(id)` (Zeile 11562) fällt für jede unbekannte ID auf
`favItems().length` durch, und `countLabel` (11592) fällt auf `"N ilahis"`
durch. Ein neuer Bereich mit einem Tippfehler in der ID zeigt also
„3 ilahis" — und meint die Zahl der Favoriten.

Kein aktueller Fehler, aber eine Falle, die beim nächsten hinzugefügten Bereich
zuschnappt.

---

### 🟡 B7 · Weitere Kleinigkeiten

| # | Befund | Ort |
|---|---|---|
| B7a | `.qcard .chev` ist auf die Karte gescopet, `resumeCard()` gibt aber einen nackten `<span class="chev">` aus → der Pfeil ist dort nicht gold und zu klein | 1351 |
| B7b | `state.burdahChapter` wird zweimal geschrieben und nie gelesen | 11055, 13584 |
| B7c | `localStorage['mawlid-reciter']` wird gelesen, aber nie geschrieben — die Rezitatoren-Auswahl gibt es nicht | 14202 |
| B7d | `msZoomStep()` wird nie aufgerufen → `state.msZoom` bleibt immer 1, `--ms-zoom` ist eine Konstante | 14869 |
| B7e | `msReflowOverflow()` — 75 Zeilen Überlaufschutz für die Manuskriptansicht, nie aufgerufen | 13645 |
| B7f | `tabHasSearch()` gibt bedingungslos `true` zurück | 11714 |
| B7g | Die Versionsanzeige erscheint **nur** im Ilahi-Tab und formatiert `v379` als `v3.79` | 9796 |
| B7h | `favItems()` überspringt nicht auflösbare Favoriten, räumt sie aber nie weg → `mawlid-favs` wächst monoton, wenn Titel geändert werden | — |
| B7i | Doppelte `::-webkit-scrollbar`-Regel in `.tabbar` | 243, 246 |
| B7j | Zwei Stellen benutzen `'UthmanicHafs', serif` ohne Amiri-Fallback | 810, 826 |
| B7k | `video2Start` / `video2End` werden gelesen, kein Datensatz trägt sie | 14554 |
| B7l | `cartouche` steht auf allen acht Ḍiyāʾ-Kapiteln, wird dort aber nie gerendert (Ḍiyāʾ hat keine Folios) | — |

---

## Teil 2 — Unfertige Inhalte

Diese Dinge sind **kein Fehler**, aber sie müssen bei der Migration bewusst
behandelt werden, sonst wandern sie unsichtbar mit.

| Bereich | Zustand |
|---|---|
| **Nasheeds** | `NASHEED_CHAPTERS = []` — vollständig leer. Der Tab existiert, die Startseite zeigt „Coming soon". Der gesamte Code (`openNasheed`, `nasheedCards`, Kürzel `n`) ist verdrahtet. |
| **Barzanjī** | 17 Kapitel, **2 Verse insgesamt**. Nur Kapitel 0 hat Inhalt; 16 Karten öffnen einen leeren Leser. |
| **Qawwalis** | Steht in `PRAISE_SECTIONS` und `TAB_CHILDREN`, aber es gibt **kein Array**, kein Kürzel, keinen Öffner. Reiner Platzhalter. |
| **Litanei-Titelplätze** | `LITANY_CHAPTERS[2]` und `[3]` sind reine Titelträger ohne Verse; die Konstanten `AZAM_TITLE_IDX` / `ISTIGHFAR_TITLE_IDX` existieren nur, um deren Namen zu lesen. |

**Empfehlung:** vor der Migration entscheiden, was davon Inhalt werden soll und
was gelöscht gehört. Ein leeres Kapitel in der Datenbank ist schlimmer als in
einem Array, weil es dort auf Dauer aussieht wie ein echter Datensatz.

---

## Teil 3 — Was die App gut macht

Damit beim Neuaufbau nichts davon aus Versehen verloren geht. Diese Dinge sind
das Ergebnis von Erfahrung mit echtem Gebrauch und nicht offensichtlich:

1. **Die Hysterese der Leseleiste** (Schwellen 88 und 32). Mit einer einzigen
   Schwelle blinkt die Bismillah mehrmals pro Sekunde. Der Kommentar im Code
   beschreibt genau diesen Fehler und die Lösung.

2. **Die `unicode-range` der Uthmani-Schrift.** Eine handgeprüfte Positivliste,
   weil die Schrift 171 Zeichen auf ein leeres Platzhalterglyph abbildet, das
   als schwarzer Klotz erscheint. Die `cmap` auszulesen führt in die Irre.

3. **Der Zentriertrick der Tab-Leiste** (`margin-inline: auto` auf erstem und
   letztem Kind statt `justify-content: center`). Zentriert, solange es passt,
   und lässt bei Überlauf den ersten Tab erreichbar.

4. **Die Höhenanpassung der Manuskriptseite im 80. Perzentil**, unter Ausschluss
   des Schlussblattes und absichtlich kurzer Seiten. Ein Mittelwert oder ein
   Maximum würde entweder überlaufen oder halbleere Blätter erzeugen.

5. **Der Audio-Cache ohne Versionsnummer.** Der Service Worker löscht bei jedem
   Update alle Caches außer dem aktuellen — außer `mawlid-audio`. Der Kommentar
   erklärt, warum: sonst verschwinden 150 MB heruntergeladene Rezitationen bei
   einer Tippfehlerkorrektur.

6. **Netzwerk-zuerst für die Seite, Cache-zuerst für alles andere.** Die frühere
   Fassung war überall cache-first, wodurch ein Deploy ohne `sw.js`-Änderung die
   App dauerhaft einfror. Vier Sekunden Zeitlimit, dann Cache.

7. **`overflow-anchor: none` global.** Ohne das kämpft die Scroll-Verankerung
   des Browsers gegen die Höhenanpassung der Manuskriptansicht.

8. **Die Suche ist absichtlich unscharf.** `q→k`, `th→t`, `sh→s`, doppelte
   Buchstaben zusammengezogen — damit „Muhammad", „Muhamad" und „Mohammed"
   dasselbe finden. Das ist keine Nachlässigkeit, sondern Absicht, und muss
   Zeichen für Zeichen übernommen werden.

9. **Kein `letter-spacing` auf Arabisch.** Wird eingehalten und an einer Stelle
   sogar kommentiert.

---

## Teil 4 — Kennzahlen

| | |
|---|---|
| Zeilen in `index.html` | 16.155 |
| Größe | 2,4 MB |
| davon base64-Schriften | ~830 KB (3 Zeilen) |
| davon base64-Bilder | ~115 KB |
| CSS | 1.160 Zeilen, ~230 Regeln, 4 Media-Queries |
| JavaScript | ~14.940 Zeilen, ~60 globale Funktionen |
| Design-Tokens | 29 hell / 26 dunkel |
| Untokenisiert | 44 Abstände, 36 Schriftgrößen, 14 Radien, 20 Schatten, 49 rgba-Literale |
| Inhaltsobjekte | 149 |
| Verse | 2.512 |
| davon unerreichbar | 950 (38 %) |
| localStorage-Schlüssel | 10 |
| Ansichtstypen (Kürzel) | 9 (`q b s i d z y n l`) |
