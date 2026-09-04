# Komponenten

Der Baukasten. Jede Komponente wird hier einmal beschrieben und danach überall
benutzt — nicht nachgebaut.

**Vor jeder neuen Komponente:** in dieser Liste nachsehen, ob es sie schon gibt.
Die Listenkarte (`ContentCard`) wird in der alten App von **vierzehn**
verschiedenen Render-Funktionen erzeugt. Genau das ist das Ziel.

---

## Zwei globale Regeln, auf die alles aufbaut

Sie stehen am Anfang des alten Stylesheets, werden nirgends erwähnt, und **fast
jede Komponente hängt von ihnen ab**:

```css
*      { margin: 0; padding: 0; box-sizing: border-box; }
button { font-family: inherit; cursor: pointer; border: none;
         background: none; color: inherit; }
```

Der zweite ist der wichtigere. Praktisch jedes antippbare Element der App ist ein
nacktes `<button>` — Listenkarte, Startkachel, Trefferzeile, Wochentagsblase,
Chip. Ohne diese Regel bekämen sie alle den Browser-Standard: graue Fläche,
Rahmen, andere Schrift.

Beide wandern unverändert nach `src/styles/base.css`. Wer sie weglässt, sucht
danach an dreißig Stellen nach dem Grund, warum Karten plötzlich aussehen wie
Formularknöpfe.

> **Aber:** `button { border: none }` entfernt auch den Fokusrahmen-Anker. Deshalb
> ist die `:focus-visible`-Regel aus `06-accessibility.md` kein Extra, sondern
> die Gegenbuchung dazu.

---

## Konventionen

- Dateien liegen unter `src/components/<Bereich>/<Name>.vue`.
- Namen sind englisch und beschreiben die **Rolle**, nicht das Aussehen:
  `ContentCard`, nicht `WhiteRoundedBox`.
- Jede Komponente definiert ihre Props mit TypeScript und dokumentiert ihre
  Zustände hier.
- Styles stehen in `<style scoped>` und benutzen ausschließlich Tokens.

---

## 1. Navigation & Kopfleisten

### `AppMasthead`

Der große Kopf der Startseite. Zentrierte Kalligrafie auf Grün, drei runde
Ecktasten.

| Prop | Typ | Bedeutung |
|---|---|---|
| `variant` | `'large' \| 'compact'` | Startseite oder Unterseite |

Die kompakte Variante ist ein Grid `1fr auto 1fr` (siehe `03-layout.md` §2.2).

### `IconButton`

Der runde Knopf, der in jeder Kopfleiste sitzt. **Ein** Rezept für alle fünf
heutigen Varianten:

```css
width: 2.3rem; height: 2.3rem;
border-radius: var(--radius-circle);
background: var(--on-brand-fill);
color: var(--brand-on);
display: flex; align-items: center; justify-content: center;
```

| Zustand | Wirkung |
|---|---|
| `:active` | `background: var(--on-brand-fill-active)` |
| `:focus-visible` | **neu** — 2 px `--accent`-Ring mit 2 px Abstand |

Das Icon ist immer `1.3rem` quadratisch, `display: block`.

> **Zu ergänzen:** Die alte App hat **überhaupt keine Fokuszustände**. Das
> gesamte Interaktionsmodell ist `:active` für Touch. Für Tastatur- und
> Screenreader-Bedienung ist ein sichtbarer Fokusring an jedem Knopf Pflicht —
> siehe `06-accessibility.md`.

### `PillButton`

Wie `IconButton`, aber `border-radius: var(--radius-pill)` und mit Text. Für die
Live-Pille. Zustand `.live` invertiert: `background: var(--accent); color: var(--brand)`.

### `TabBar` / `TabItem`

Waagerechte Leiste auf `--brand-deep`, waagerecht scrollbar, Scrollleiste
verborgen.

**Der Zentrier-Trick** (unverändert übernehmen):

```css
.tabbar { display: flex; justify-content: flex-start; overflow-x: auto; }
.tabbar > :first-child { margin-inline-start: auto; }
.tabbar > :last-child  { margin-inline-end:   auto; }
```

Automatische Ränder zentrieren die Leiste, solange sie passt, und fallen bei
Überlauf auf null zusammen — dadurch bleibt der erste Tab immer scrollbar
erreichbar. Ein `justify-content: center` würde ihn unerreichbar machen.

Ein Tab ist zweizeilig: lateinische Beschriftung (`--text-sm`, 700) über
arabischer (`--text-lg`, Deckkraft 0,85).

| Zustand | Wirkung |
|---|---|
| `.active` | `background: var(--accent)`, Rand `--accent-soft`, Text `--brand-deep`. Arabisch geht auf Deckkraft 1. |

Ein Tab bleibt aktiv, solange man in **einem seiner Unterbereiche** ist. Nach
jedem Rendern wird der aktive Tab in die Mitte gescrollt (`centerActiveTab`).

---

## 2. Karten & Listen

### `ContentCard`

Die meistbenutzte Komponente der App. Eine Zeile in jeder Übersicht.

```
┌──────────────────────────────────────────────┐
│  ⓵   قَصِيدَةُ الْبُرْدَة                          ›  │
│      1 · The Qasida Burdah                   │
└──────────────────────────────────────────────┘
```

| Prop | Typ | Bedeutung |
|---|---|---|
| `number` | `number \| null` | Zeigt das goldene Zahlenmedaillon |
| `titlePrimary` | `string` | Arabisch (oder lateinisch bei `latin`-Stücken) |
| `titleSecondary` | `string` | Lateinischer Titel |
| `lead` | `'primary' \| 'secondary'` | Welche Zeile oben steht |
| `script` | `'arab' \| 'latn'` | Bestimmt Schriftstimme und Richtung |

**Aufbau:** `display: flex; align-items: center; gap: 1rem`. Die Titelspalte ist
ein **expliziter Flex-Spaltencontainer** mit `min-width: 0`. Das ist kein Detail:
als reine Inline-Spans lässt eine kurze führende Zeile den arabischen Titel
danebenrutschen statt darunter.

**Die `lead`-Variante** ist der Dalāʾil-Index: dort führt der Wochentag auf
Englisch, und der arabische Ḥizb-Titel steht darunter eine Stufe kleiner.

| Zustand | Wirkung |
|---|---|
| `:active` | `transform: scale(.985)` |
| `:focus-visible` | Fokusring (neu) |

**Bekannter Fehler zum Mitnehmen:** die Wiederaufnahme-Karte
(`resumeCard`) gibt einen nackten `<span class="chev">` aus, aber die einzige
Chevron-Regel ist `.qcard .chev` — dort erbt der Pfeil also Textfarbe und
Standardgröße statt Gold in 1,2 rem. Im Neuaufbau ist der Chevron Teil der
Komponente und kann nicht danebengehen.

### `HomeTile`

Die Kachel des 3×3-Startrasters. Quadratisch, drei Textzeilen, kein Icon.

| Prop | Typ |
|---|---|
| `titleArabic` | `string` |
| `titleLatin` | `string` |
| `count` | `string \| null` — z. B. „15 Teile" |
| `to` | `RouteLocation` |

Zustände: `:hover` → Rand auf `--accent-soft`; `:active` → `scale(.98)`.

### `HomeMedallion`

Die Kalligrafie in der Mittelzelle. Reine Anzeige, nicht klickbar (oder als
Verknüpfung zur Info-Seite, falls gewünscht). Kreisförmig, dünner Goldring,
radialer Verlauf nach außen ins Nichts.

### `SectionIntro`

Der einleitende Satz oben auf einer Bereichsseite. Crimson Pro, `--ink-soft`,
zentriert, max. 640 px. Die Beschreibung eines Bereichs steht **hier** und nicht
auf der Startkachel.

---

## 3. Leser

### `ReaderBar`

Klebende Leiste, drei gleich breite Slots (siehe `03-layout.md` §2.3).

| Prop | Typ |
|---|---|
| `slim` | `boolean` — vom Scroll-Composable mit Hysterese gesetzt |

Enthält: Zurück-Knopf, Bismillah-Bild (klappt bei `slim` auf Breite 0),
Theme-Umschalter, Ansichtstausch, Lesezeichen.

**Der Ansichtstausch erscheint nur im Schlank-Modus** — solange die Leiste voll
ist, steht der beschriftete `ViewSwitch` gleich darunter in den Chips. Zwei
Umschalter für dieselbe Sache gleichzeitig wären verwirrend.

### `ControlChip`

Die Pille unter dem Titel. Ein Rezept, vier Varianten.

```css
font-size: var(--text-sm); font-weight: 700;
letter-spacing: 0.03em;
padding: 0.4rem 0.85rem;
border-radius: var(--radius-pill);
border: 1.5px solid var(--accent);
color: var(--ink-chip);
background: transparent;
```

| Variante | Wirkung | Wofür |
|---|---|---|
| *(Basis)* | wie oben | An-Zustand von Umschaltern |
| `off` | Deckkraft 0,85, Rand und Text auf `--ink-soft` | Aus-Zustand. **Deckkraft allein reichte nicht** — auf dunklem Grund war es unlesbar. Deshalb wechselt zusätzlich die Farbe. |
| `size` | Rand `--surface-border`, Fläche `--surface-card` | Die vier Größenschritte `أ− أ+ a− a+` |
| `icon` | quadratischere Polsterung, SVG auf 1 rem | Vollbildtaste |

> **Fehlende Zustände, die zu ergänzen sind:** Der Basis-Chip hat weder `:hover`
> noch `:active` noch `:focus-visible`. Alle drei kommen dazu.
>
> Zusätzlich gibt der alte Code an einer Stelle `chip on` aus, aber `.chip.on`
> existiert nicht — der Zustand ist unsichtbar. In der Komponente ist das nicht
> mehr möglich, weil die Varianten aufgezählte Werte sind.

### `ViewSwitch`

Segmentierter Schalter „Book Version / Study Version". Umschließende Pille mit
`overflow: hidden`, Segmente randlos, aktives Segment
`background: var(--ink-accent); color: var(--brand-on)`.

Trägt `role="group"` und ein `aria-label`. Erscheint nur, wenn das Stück
Folio-Angaben hat.

### `VerseCard`

Ein Vers in der Lese-Ansicht.

```
        ⓶                        ← Zahlmedaillon, in die Kante eingekerbt
┌──────────────────────────────┐
│   الْعَرَبِيّ  ۞  النَّصّ           │  --font-arabic, --ar-size, RTL, zentriert
│      transliteration          │  kursiv, --ink
│      translation              │  Crimson Pro, --ink-soft
└──────────────────────────────┘
```

Das Zahlmedaillon sitzt `top: -0.85rem`, mittig, mit
`background: var(--surface-page)` — dadurch stanzt es ein Loch in den
Kartenrahmen, statt darauf zu liegen.

| Variante | Wirkung |
|---|---|
| `refrain` | Rand `--accent-soft`, Verlauf `--surface-card → --surface-card-alt`, dazu die Beschriftung „Refrain · يُرَدَّد" |
| `instruction` | Rand `--accent` 1,5 px, blasse Goldlasur. Arabisch in Gold, Übersetzung kursiv in Klammern, **Umschrift ausgeblendet**. Beschriftung „Instruction · إِرْشَاد" |
| `placed` | Der gespeicherte Lesepunkt: goldener Rand plus ein 3 px breites Goldband am inneren Rand der Karte |

> **Achtung, echter Fehler in der alten App:** die Regel `.verse.v-instruction`
> greift heute **nicht**. Über ihr steht ein verwaister Deklarationsblock
> (`index.html:889-892`) — ein gelöschter Selektor hat seine Deklarationen
> zurückgelassen. Der CSS-Parser zieht diese Zeilen in den Selektor der nächsten
> Regel, wodurch der ganze `.verse.v-instruction`-Block ungültig wird und
> verworfen wird. Die Kindregeln greifen weiter, der Rahmen und die Goldlasur
> fehlen. Details und der Einzeiler-Fix stehen in
> `docs/architecture/07-migration.md`.
>
> Derselbe verwaiste Block ist der Rest der gelöschten Regel `.v-note`, die vom
> Code weiterhin ausgegeben wird und **völlig ungestylt** ist.

### `VersePlaceButton`

Das kleine Lesezeichen oben links in der Verskarte, nur bei Dalāʾil. Deckkraft
0,35 in Ruhe, 1 im An-Zustand.

Die Hover-Anhebung steht hinter `@media (hover: hover)` — sonst bleibt sie auf
Touch-Geräten nach dem Tippen kleben.

### `AutoScrollBar`

Schwebende Leiste am unteren Rand. Start/Stopp und Geschwindigkeit.

Neun Stufen, `0.14`–`0.70` px pro Bild, beschriftet `0.2×`–`1×`. Der
Wertebereich ist absichtlich ganz am langsamen Ende — schneller ist zum
Mitrezitieren unbrauchbar.

Der Schleifenschritt liest die Geschwindigkeit **bei jedem Bild neu**, damit eine
Änderung sofort greift, ohne die Schleife neu zu starten. Sie stoppt selbsttätig
am Dokumentende.

---

## 4. Manuskript

Alles hier liegt in einem `.theme-manuscript`-Block und benutzt die normalen
semantischen Tokens (siehe `01-tokens.md` §4).

### `ManuscriptBook`

Der waagerechte Blätterstapel. `direction: rtl`, `scroll-snap-type: x mandatory`.

### `ManuscriptLeaf`

Das Blatt. Der **Vierfachrahmen** ist die Signatur des Designs und wird
Pixel für Pixel übernommen:

```css
box-shadow:
  0 0 0 3px   var(--surface-card) inset,   /* Papierspalt */
  0 0 0 4.5px var(--accent)       inset,   /* innere Goldlinie */
  0 3px 14px  var(--shadow-tint-deep);     /* Schlagschatten */
border: 1.5px solid var(--surface-border); /* äußere braune Linie */
border-radius: var(--radius-leaf);         /* 2px — fast eckig, mit Absicht */
```

### `ManuscriptBand`

Das illuminierte Kopfband. Ein SVG-Muster (`msGul`) aus Feld, Goldlinie, acht
gedrehten Blüten und Papierscheibe, gekachelt über die Blattbreite, mit einer
Kartusche darüber.

**Dieses SVG benutzt die Tokens direkt in seinen `fill`-Attributen** und folgt
dadurch dem Thema von selbst. So wird es auch im Vue-Aufbau gemacht — als
Inline-SVG-Komponente, nicht als Bilddatei.

Varianten: `head` (Blattkopf), `divider` (Teiler in Blattmitte, Muster auf 55 %
Deckkraft — „eine Pause, kein zweites Kopfstück"), `inline`.

### `ManuscriptSegment`

Eine antippbare Phrase im Manuskripttext. Zustände: `:active` (Goldlasur),
`marked` (Lasur + 1 px Goldring), `placed` (Lasur + 2 px Ring + 4 px Halo).

### `useManuscriptFit`

Kein Bauteil, sondern der Composable, ohne den das Layout nicht funktioniert.
Der Algorithmus steht in `03-layout.md` §4.2. **Er ist Pflicht**, nicht
Feinschliff.

---

## 5. Suche

### `SearchField`

Runde Eingabe mit Lupe links und Löschtaste rechts. Auf der Startseite sitzt sie
**fest am unteren Bildschirmrand** (`.at-bottom`, mit stärkerem Schatten), auf
allen anderen Seiten oben im Fluss.

### `SearchHit`

Ein Trefferausschnitt unterhalb einer Karte. Zeigt die Fundstelle mit
Umgebungstext, das Suchwort in einer Goldlasur hervorgehoben.

Höchstens **sechs** Treffer pro Stück, darunter „+N weitere Zeilen". Diese
Deckelung bleibt: sonst füllt ein häufiges Wort wie „Allah" die ganze Seite.

### `useHitFlash`

Beim Springen zu einem Treffer blitzt die Zielstelle kurz auf:

```css
--shadow-flash: 0 0 0 2px var(--accent), 0 0 16px rgb(from var(--accent) r g b / .55);
```

---

## 6. Dalāʾil-Index (`.dk-*`)

Ein kleines, in sich geschlossenes Muster, das von **drei** fast identischen
Bildschirmen benutzt wird (Dalāʾil, Aʿẓam, Istighfār). Im Neuaufbau wird daraus
**eine** Komponente mit Daten als Prop.

### `TodayCard`

Die Hero-Karte „Heute · Dienstag". Der einzige mehrstufige Verlauf der App außer
der Refrain-Karte:

```css
background: linear-gradient(160deg, var(--brand), var(--ink-accent));
border: 1.5px solid var(--accent);
```

### `WeekdayGrid`

`grid-template-columns: repeat(4, 1fr)`, acht Blasen (4+4, der zweite Montag
zuletzt). Die Blase des heutigen Tages trägt `.on`:
`background: var(--ink-accent)`, lateinische Zeile in `--brand-on`, arabische in
`--accent-soft`.

### `RowLabel`

Zweisprachige Zeilenüberschrift: lateinisch in Versalien mit Laufweite und Gold,
arabisch daneben **ohne Laufweite**.

### `NavRow`

Volle Breite, zweizeilige Beschriftung, goldener `›` absolut rechts positioniert.

---

## 7. Ornamente

| Asset | Form | Themenfähig |
|---|---|---|
| `MsGulPattern` | Gewebtes Kachelmuster für das Kopfband | ✅ benutzt Tokens direkt |
| `MsBand` | Das Kopfband: Muster plus zwei Goldlinien | ✅ |
| `MsCorner` | Eckrosette für das Schlussblatt | ✅ |
| `Rosette` | Der Versteiler ۞ | ⚠️ heute zwei Bilder, im Neuaufbau Inline-SVG mit `currentColor` |

> **Warum die Rosette als Inline-SVG mehr ist als eine Verschönerung:** Ihre
> heutige Umsetzung braucht `font-family: 'Amiri', serif !important` und
> `color: transparent !important`. Das sind die einzigen `!important`-Farb- und
> Schriftregeln im ganzen Stylesheet — und in Vue kollidieren sie mit
> `<style scoped>`: eine gescopte Regel kann ein `!important` aus dem globalen
> Stylesheet nicht überschreiben. Als Komponente mit `fill="currentColor"`
> entfällt das Problem ersatzlos.
| `StarBand` | Sternenband über der Kopfnaht | ❌ **heute gar nicht gerendert** |
| `CornerMotif` | Gitter-Dreieck | ❌ definiert, nie benutzt |
| `Bismillah` | Kalligrafie-Bild | Raster |
| `Logo` | محمد-Kalligrafie | Raster |

**Aufgaben beim Übertragen:**

1. `StarBand` und `CornerMotif` sind **beide definiert und werden beide nie
   benutzt** — die Konstanten stehen im Code, werden aber in kein Template
   eingesetzt. Beim Sternenband hängen zusätzlich drei ungenutzte Tokens
   (`--ornament-star-*`) daran. Entweder bewusst zurückholen — dann als
   Inline-SVG mit `currentColor` bzw. den Tokens, damit sie dem Thema folgen —
   oder Konstanten und Tokens streichen. Was nicht geht: sie unbesehen
   mitschleppen.
2. Die beiden Kalligrafien liegen als base64-PNG (~54 KB und ~50 KB) im
   Quelltext. Sie werden echte Dateien unter `public/img/`. **Idealerweise als
   SVG nachgezeichnet** — dann folgen sie dem Thema und sind auf jedem
   Bildschirm scharf.
3. Ein drittes Bismillah-Bild (~10 KB) liegt im Code und wird nie benutzt.
   Löschen.

---

## 8. Zustands- und Leerdarstellungen

### `EmptyState`

Für „noch nichts gespeichert", „keine Treffer", „demnächst". Zentriert, `2.4rem`
Blockpolsterung, ein Satz in `--ink-soft`, optional ein arabischer Stern
darüber.

**Kein Illustrationsbild, keine Aufforderung.** Ein leerer Favoritenordner
braucht keinen Marketingtext.

### `SkeletonCard`

**Neu — gab es vorher nicht.** Weil Inhalte jetzt über das Netz kommen, gibt es
einen Zwischenzustand, den die alte App nicht hatte. Ein Kartenumriss in
`--surface-card-alt` mit einem sehr ruhigen Puls. Wegen ADR-004 (online-first)
ist dieser Zustand kein Randfall, sondern etwas, das man bei jedem Öffnen sieht.

### `ErrorState`

Ebenfalls neu. Wenn die API nicht erreichbar ist, muss die App das ehrlich sagen
und einen erneuten Versuch anbieten — nicht eine leere Liste zeigen, die
aussieht, als gäbe es die Inhalte nicht mehr.

---

## 9. Was es bewusst **nicht** gibt

Damit niemand danach sucht:

- **Keinen Modaldialog** außer der QR-Anzeige. Was mehr Platz braucht, ist eine
  eigene Route.
- **Keinen Tooltip.** Auf Touch nutzlos.
- **Keine Toasts** außer für Kopier-Bestätigungen.
- **Keinen Akkordeon-/Ausklapp-Baustein** im Lesebereich. Ein Vers klappt nicht
  zu.
- **Keinen Ladebalken oben.** Skeletons statt dessen.
