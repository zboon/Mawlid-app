# Typografie

Die Schrift ist in dieser App keine Oberflächenentscheidung, sondern Inhalt. Ein
falsch gesetztes Harakat ändert, wie ein Vers gelesen wird. Dieses Kapitel ist
deshalb strenger als die übrigen.

---

## 1. Die drei Stimmen

Die App spricht in genau drei Schriftstimmen. Jede hat eine klare Aufgabe, und
keine übernimmt die Aufgabe einer anderen.

| Stimme | Stack | Aufgabe |
|---|---|---|
| **Arabisch** | `'UthmanicHafs', 'Amiri', serif` | Jeder arabische Text — Verse, Titel, Beschriftungen, Kartuschen |
| **Editorial** | `'Crimson Pro', serif` | Übersetzungen, Notizen, Hinweise, Untertitel, Schalterbeschriftungen |
| **Oberfläche** | `'Karla', system-ui, sans-serif` | Alles Funktionale: Knöpfe, Chips, Zählwerte, Formulare |

**Ausnahmen, die dokumentiert bleiben müssen:**

- Die Rosette ۞ ist **fest auf Amiri gepinnt** (`font-family: 'Amiri', serif !important`).
  Sie ist ein Ornament und muss unabhängig davon gleich aussehen, in welcher
  Schrift der Text drumherum steht. Das ist das einzige berechtigte `!important`
  im Stylesheet.
- Der QR-Code-Ersatztext benutzt `ui-monospace, Menlo, Consolas, monospace`.

**Zwei Stellen im alten Code benutzen `'UthmanicHafs', serif` ohne
Amiri-Fallback** (arabische Rezitatorennamen im Audio-Dock). Das ist ein
Versehen, kein Muster: fehlt in Uthmani ein Zeichen, fällt es dort auf eine
Systemschrift statt auf Amiri. Im Neuaufbau gibt es **nur einen** arabischen
Stack, definiert als Token:

```css
--font-arabic: 'UthmanicHafs', 'Amiri', serif;
--font-serif:  'Crimson Pro', Georgia, serif;
--font-ui:     'Karla', system-ui, -apple-system, sans-serif;
```

---

## 2. Die `unicode-range` — das Detail, das man nicht wegoptimieren darf

Das hier ist die wichtigste einzelne Zeile im gesamten Stylesheet:

```css
@font-face {
  font-family: 'UthmanicHafs';
  src: url(…);
  unicode-range:
    U+0600, U+0621-063A, U+0640-0657, U+065C, U+065E,
    U+0660-0669, U+066E, U+0670-0671, U+06D6-06DD,
    U+06E0-06E2, U+06E4-06E9, U+06EC;
}
```

**Warum sie da ist.** Die Schrift KFGQPC Uthmanic Hafs bildet 171 Codepoints —
darunter das arabische Komma, den Strichpunkt, das Fragezeichen, den Punkt, die
Rosette ۞ und sämtliche persischen Buchstaben — auf ein **leeres
Platzhalterglyph** ab. Das rendert nicht als „nichts", sondern als **schwarzer
Klotz**.

Man kann das nicht dadurch prüfen, dass man in die `cmap` der Schrift schaut:
die Zeichen *sind* dort eingetragen, sie werden nur nicht gezeichnet. Die
`unicode-range` ist deshalb eine von Hand geprüfte Positivliste der Zeichen, die
die Schrift wirklich zeichnet. Alles andere fällt absichtlich auf Amiri durch —
und darum sieht ein arabisches Komma aus wie ein Komma.

**Regeln daraus:**

1. Diese Zeile wird nicht „aufgeräumt", nicht erweitert und nicht generiert.
2. Wird die Schriftdatei jemals getauscht oder aktualisiert, muss der Bereich
   **neu ermittelt** werden — durch Rendern, nicht durch Auslesen der cmap.
3. Die Datei darf **nicht subgesetzt** werden. Die Lizenz verbietet Änderungen
   an der Schrift. Das kostet rund 330 KB, und das ist der Preis.

---

## 3. Ausliefern der Schriften

### Heute

Alle drei arabischen Schnitte stecken als base64 direkt im HTML — zusammen rund
830 KB der 2,4 MB. Crimson Pro und Karla kommen von Google Fonts.

### Im Vue-Aufbau

Base64 im Stylesheet fällt weg. Die Schriften werden zu echten Dateien unter
`public/fonts/` und mit `preload` geladen:

```html
<link rel="preload" href="/fonts/uthmanic-hafs.otf" as="font" type="font/otf" crossorigin>
<link rel="preload" href="/fonts/amiri-regular.woff2" as="font" type="font/woff2" crossorigin>
```

Das ist in jeder Hinsicht besser: die Dateien werden vom Browser eigenständig
gecacht, blockieren das erste Rendern nicht und lassen sich versionieren.

**Auch Crimson Pro und Karla werden selbst gehostet.** Zwei Gründe: die App
läuft lokal, also ist eine Abhängigkeit von Googles CDN unnötig; und Google
Fonts als Fremdaufruf ist datenschutzrechtlich in Deutschland eine unnötige
Diskussion.

### Lizenzen — bindend

| Schrift | Lizenz | Was erlaubt ist |
|---|---|---|
| **Amiri** | SIL OFL 1.1 | Einbetten, weitergeben, ändern. `OFL.txt` **muss** mitgeliefert werden. |
| **KFGQPC Uthmanic Hafs** | frei nutzbar, **Änderung verboten** | Byte-für-Byte weitergeben. Kein Subsetting, keine Konvertierung nach WOFF2, keine Optimierung. |
| **Crimson Pro, Karla** | SIL OFL 1.1 | wie Amiri |

Die Lizenzdateien wandern nach `public/fonts/LICENSES/` und werden im Impressum
verlinkt.

> **Falle:** Ein Build-Werkzeug, das Schriften automatisch subsetzt
> (`vite-plugin-font-subset`, `subfont` und Ähnliche), verletzt bei der
> Uthmani-Schrift die Lizenz **und** zerstört die `unicode-range`-Logik. Es darf
> auf `public/fonts/` nicht angewandt werden.

---

## 4. Größen

Die alte App benutzt 36 verschiedene Schriftgrößen. Ersetzt durch neun Stufen
plus die skalierenden Lesegrößen:

```css
:root {
  --text-2xs: 0.6rem;    /* Zählwerte in Versalien, Build-Tag */
  --text-xs:  0.72rem;   /* Zeilenüberschriften, Versalien-Labels */
  --text-sm:  0.8rem;    /* Chips, Tabs, Sekundärtext */
  --text-md:  0.85rem;   /* Kartentitel lateinisch */
  --text-base:0.95rem;   /* Fließtext */
  --text-lg:  1.1rem;    /* Hervorgehobener Fließtext */
  --text-xl:  1.35rem;   /* Kartentitel arabisch */
  --text-2xl: 1.45rem;   /* Stücktitel arabisch */
  --text-3xl: 1.9rem;    /* Standardgröße Vers arabisch (= --ar-size) */
}
```

### Die skalierenden Lesegrößen

Nur im Leser, nur diese vier, und alle über die Laufzeit-Tokens:

| Element | Formel | Basis |
|---|---|---|
| Arabischer Vers | `font-size: var(--ar-size)` | 1,9 rem |
| Umschrift | `calc(1.02rem * var(--latin-scale))` | 1,02 rem |
| Übersetzung | `calc(1.12rem * var(--latin-scale))` | 1,12 rem |
| Türkischer Text | `calc(1.5rem * var(--latin-scale))` | 1,5 rem |

Grenzen (aus dem alten Code übernommen und beizubehalten):

```ts
arScale:    0.7 … 1.6      →  --ar-size  = 1.9rem * arScale
latinScale: 0.8 … 1.8      →  --latin-scale
```

Beim Verlassen des Lesers werden beide auf den Standard zurückgesetzt. Sonst
erbt die Indexseite eine 3-rem-Arabischgröße und sieht kaputt aus.

---

## 5. Zeilenhöhe

Arabisch mit voller Vokalisierung braucht deutlich mehr Durchschuss als
lateinischer Text — die Harakat stehen über und unter der Grundlinie, und bei zu
enger Führung berühren sie die Nachbarzeile.

```css
--leading-arabic-verse: 2.1;    /* .v-ar   — vokalisierter Vers, luftig */
--leading-arabic-ms:    2.15;   /* .ms-text — Manuskript, noch etwas mehr */
--leading-arabic-title: 1.6;    /* Titel, kurz, kein Fließtext */
--leading-body:         1.5;    /* lateinischer Fließtext */
--leading-tight:        1.3;    /* Kartentitel, Beschriftungen */
```

**Nicht unter 1,9 gehen** bei vokalisiertem Fließtext. Das ist keine
Geschmacksfrage.

---

## 6. Laufweite (letter-spacing)

**Auf arabischen Text wird niemals `letter-spacing` angewandt.** Arabisch ist
eine verbundene Schrift; Laufweite bricht die Ligaturen auf und macht aus einem
Wort eine Kette von Einzelbuchstaben. Der alte Code hält das ein und
dokumentiert es an einer Stelle sogar ausdrücklich:

```css
.dk-rowlab .l-ar { letter-spacing: 0; }   /* Kommentar: bricht die kursive Verbindung */
```

Für lateinische Versalien-Beschriftungen gilt das Gegenteil — dort ist Laufweite
nötig:

```css
--tracking-caps: 0.13em;   /* Zeilenüberschriften, Zählwerte, "Refrain" */
--tracking-wide: 0.07em;   /* Sitzungs-Pille */
--tracking-none: 0;        /* alles Arabische, immer */
```

---

## 7. Schreibrichtung

### Grundregel

Die Anwendung ist **LTR**. Arabischer Inhalt wird punktuell auf RTL gestellt,
nicht die ganze Seite.

```css
.v-ar, .ms-text, .qcard .t-ar { direction: rtl; }
```

Ein Sonderfall, der oft überrascht und in der alten App richtig gelöst ist: in
der Listenkarte steht der arabische Titel `direction: rtl`, aber
`text-align: left`. Der Text läuft also rechts nach links, ist aber am linken
Kartenrand ausgerichtet — weil die Karte selbst eine LTR-Karte ist und der Titel
mit dem englischen Untertitel darunter bündig stehen muss.

### Wo RTL wirklich die Richtung dreht

Nur an einer Stelle: die Manuskriptansicht.

```css
.ms-book { direction: rtl; }   /* Blätter laufen rechts nach links */
```

Das ist gewollt — ein arabisches Buch blättert so. Die Rasterung
(`scroll-snap`) ist darauf abgestimmt.

### Für die Zukunft: arabische Oberfläche

Wenn die Oberfläche irgendwann auf Arabisch umgestellt werden soll, dreht sich
die ganze Seite. Damit das dann nicht hunderte Regeln kostet, gilt ab sofort:

**Logische Eigenschaften statt physischer, überall:**

| Statt | Benutze |
|---|---|
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `left` / `right` | `inset-inline-start` / `inset-inline-end` |
| `text-align: left` | `text-align: start` |
| `border-left` | `border-inline-start` |

Der alte Code benutzt an einer Stelle bereits `padding-inline-start` — die
Richtung stimmt, sie muss nur konsequent werden.

**Ausgenommen** sind Stellen, die absichtlich physisch sind: die Rosette, die
Ornamente und alles innerhalb der Manuskriptseite, deren Geometrie an der
tatsächlichen Blattkante hängt.

---

## 8. Das `latin: true`-Problem

Die türkischen Ilahis stehen heute im Feld `ar` — mit einem Flag `latin: true`,
das dem Renderer sagt: das ist gar kein Arabisch, setz es links nach rechts in
Crimson Pro. Das Feld `tr` (Umschrift) bleibt leer, weil lateinischer Text keine
Umschrift braucht, und der Umschrift-Schalter wird ausgeblendet.

Das funktioniert, ist aber eine Notlösung: ein Feld namens `ar` enthält kein
Arabisch.

**Im neuen Datenmodell wird das aufgelöst.** Statt drei fester Spalten
(`ar` / `tr` / `en`) gibt es Verstexte mit einer Sprache und einer Rolle:

```
verse_texts: (verse_id, lang, role, script, body)
  role:   'original' | 'transliteration' | 'translation'
  script: 'arab' | 'latn'
```

Ein Ilahi hat dann schlicht `lang='tr', role='original', script='latn'` — kein
Flag, keine Ausnahme im Renderer. Die Anzeige entscheidet anhand von `script`,
welche Schriftstimme und welche Richtung gilt. Details in
`docs/architecture/05-database.md`.

---

## 9. Die Rosette ۞

Der Versteiler ist keine gewöhnliche Type. Er wird durch ein Hintergrundbild
ersetzt:

```css
.rosette {
  background-image: url("data:image/svg+xml,…");   /* helles Thema */
  background-size: 1.24em 1.24em;
  color: transparent !important;                    /* das echte Glyph verstecken */
  font-family: 'Amiri', serif !important;
}
html.dark .rosette {
  background-image: url("data:image/svg+xml,…");   /* zweites Bild fürs dunkle Thema */
}
```

**Warum zwei Bilder statt einer Variablen:** ein data-URI-SVG hat keinen Zugriff
auf CSS Custom Properties. Es gibt keinen Weg, die Farbe von außen zu setzen.

**Aufräumaufgabe im Neuaufbau:** in der alten Fassung sind die Goldtöne der
beiden Bilder vertauscht — das helle Bild benutzt das Dunkelmodus-Gold und
umgekehrt. Beim Übertragen korrigieren. Besser noch: die Rosette wird eine
Inline-SVG-Komponente mit `fill="currentColor"`, dann entfällt das Problem
ganz und sie folgt automatisch dem Thema.

**Der ﷺ-Mark ist keine Rosette.** Er steigt bewusst aus der Bildersetzung aus
(`background-image: none`) und bleibt ein Buchstabe in `--ink` bei 85 %
Deckkraft. Das ist richtig so: er ist Schrift, kein Ornament.

---

## 10. Prüfliste vor jedem Merge, der Typografie berührt

- [ ] Kein `letter-spacing` auf einem Element mit arabischem Text
- [ ] Zeilenhöhe vokalisierter Verse ≥ 1,9
- [ ] Nur die drei Stacks benutzt, keine vierte Familie eingeschleust
- [ ] `unicode-range` unverändert
- [ ] Neue Textgrößen aus der Skala, nicht frei gewählt
- [ ] Logische Eigenschaften statt `left`/`right`
- [ ] Im Dunkelmodus gegengelesen, nicht nur im hellen
