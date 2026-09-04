# Layout

Wie eine Seite aufgebaut ist: Gerüst, Kopfleisten, die Startseite, der Leser,
Breakpoints und die globalen Modi.

---

## 1. Das Gerüst

Es gibt **zwei** Seitengerüste, nicht mehr. Jeder neue Bereich benutzt eines von
beiden.

### Gerüst A — Index- und Übersichtsseiten

```
┌─ .topbar ─────────────────────────────┐  sticky, z-nav
│  Masthead (groß auf Start / kompakt)  │
│  Tab-Leiste (entfällt auf Start)      │
└───────────────────────────────────────┘
┌─ main.index ──────────────────────────┐  max-width 640px, zentriert
│  Suchfeld                             │
│  Inhalt (Karten, Raster, Listen)      │
└───────────────────────────────────────┘
   footer
```

### Gerüst B — Leseseiten

```
┌─ .reader-bar ─────────────────────────┐  sticky, z-sticky
│  ‹ Zurück   [Bismillah]   ☾ ⇄ 🔖      │
└───────────────────────────────────────┘
   .piece-head       Titel arabisch + englisch
   .controls         Chips: Umschrift, Übersetzung, Größe, Ansicht
┌─ main.verses ─────────────────────────┐  max-width 640px
│  Verse  —  oder  Manuskriptblätter    │
└───────────────────────────────────────┘
   .autoscroll-bar                         schwebend, unten
```

Kein Masthead, keine Tab-Leiste. Der Leser ist ein eigener Zustand, kein
Unterbereich einer Indexseite. Das ist bewusst so: beim Rezitieren soll nichts
von der Navigation ablenken.

### Die Breitenbegrenzungen

Sie sind verbindlich und gelten für jeden neuen Bereich:

| Container | max-width | Wofür |
|---|---|---|
| `.index`, `.verses`, `.controls` | `640px` | Fließtext, Listen, Verse |
| `.home-grid` | `600px` | Das Startraster |
| `.session-panel` | `520px` | Schmale Formularflächen |
| `.ms-sheet` | `660px` | Ein Manuskriptblatt |

Seitenrand ist immer `--space-xl` (1,1 rem). Der untere Rand rechnet die
sichere Fläche mit ein und lässt Platz für die schwebenden Leisten:

```css
padding-bottom: calc(env(safe-area-inset-bottom, 0px) + var(--space-4xl));
/* im Leser: + 7rem, weil dort die Autoscroll-Leiste steht */
```

---

## 2. Die Kopfleisten

Es gibt **drei** Kopfleisten, und keine vierte wird gebaut.

### 2.1 Großer Masthead — nur auf der Startseite

Zentrierte Kalligrafie auf Grün. Drei absolut positionierte Ecktasten:
Home links, Live und Theme rechts. Alle auf
`top: calc(env(safe-area-inset-top) + var(--space-md))`.

Auf der Startseite ist die obere Leiste `position: static` — sie darf
wegscrollen. Der Grund: die Kalligrafie ist groß und würde als klebende Leiste
den halben Bildschirm kosten.

### 2.2 Kompakter Masthead — jede Seite unterhalb der Startseite

Ein **CSS-Grid mit drei Spalten** `1fr auto 1fr`:

```
[ Home  Zurück ]      [ Bismillah ]      [ Live  ☾ ]
   justify-self:start    zentriert        justify-self:end
```

Die `1fr`-Spalten links und rechts sind gleich breit. Dadurch sitzt die
Bismillah auf der *echten* Mitte der Leiste, nicht auf der Mitte zwischen zwei
unterschiedlich breiten Tastengruppen. Diesen Trick übernehmen wir unverändert —
er ist der Unterschied zwischen „sieht ordentlich aus" und „sitzt schief".

Diese Leiste ist `position: sticky; top: 0`.

### 2.3 Leseleiste

Dieselbe Drei-Slot-Technik, aber mit Flexbox:

```css
.rside     { flex: 1 1 0; display: flex; align-items: center; min-width: 0; }
.rside.end { justify-content: flex-end; }
```

**Der Schlank-Modus** ist ein Detail, das man leicht falsch baut. Beim Scrollen
klappt die Bismillah auf Breite 0 und die Leiste wird flacher. Wenn man dafür
*eine* Schwelle benutzt, entsteht eine Endlosschleife: die Leiste wird flacher →
der Inhalt rutscht hoch → das Dokument wird kürzer → `scrollY` fällt unter die
Schwelle → die Bismillah kommt zurück → mehrmals pro Sekunde.

Die Lösung sind **zwei weit auseinanderliegende Schwellen** (Hysterese):

```ts
const SLIM_ON  = 88   // ab hier einklappen
const SLIM_OFF = 32   // erst hier wieder ausklappen
```

Und die Messung läuft über `requestAnimationFrame`, nicht bei jedem
Scroll-Ereignis.

---

## 3. Die Startseite — das 3×3-Raster

Das ist der einzige Teil des Layouts, der **neu** ist. Die Skizze zeigt neun
Zellen, mit der Kalligrafie in der Mitte.

```
┌─────────┬─────────┬─────────┐
│         │ Dalāʾil │ Mawlid  │
│         │ Khayrāt │         │
├─────────┼─────────┼─────────┤
│         │  ﴾محمد﴿  │ Silsila │
│         │  Medail-│         │
│         │   lon   │         │
├─────────┼─────────┼─────────┤
│         │ Sohbets │ Ottoman │
└─────────┴─────────┴─────────┘
```

### Aufbau

```css
.home-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 1fr;              /* quadratische Zellen */
  gap: var(--space-sm);
  max-width: 600px;
  margin: 0 auto;
  padding: var(--space-xl);
}

/* Das Medaillon sitzt fest in der Mitte, egal wie viele Module es gibt. */
.home-medallion {
  grid-column: 2;
  grid-row: 2;
  display: grid;
  place-items: center;
  border-radius: var(--radius-circle);
  border: 1px solid var(--accent-line-soft);
  background: radial-gradient(circle, var(--surface-card), transparent 70%);
}
```

Die Kacheln fließen mit `grid-auto-flow: dense` um das Medaillon herum. Sie
werden nicht einzeln positioniert — sonst müsste bei jedem neuen Modul das CSS
angefasst werden. Stattdessen: das Medaillon belegt fest Zelle (2,2), alle
anderen füllen die verbleibenden Zellen in ihrer `sort_order`.

### Was in eine Kachel gehört

```
┌──────────────────┐
│                  │
│   دلائل الخيرات    │   ← arabischer Titel, UthmanicHafs, --ink-accent
│  Dalāʾil Khayrāt │   ← lateinischer Titel, 700, --ink
│    15 Teile      │   ← Zählwert, klein, gold, Versalien
│                  │
└──────────────────┘
```

Kein Icon, keine Illustration, keine Beschreibung. Die Beschreibung
(`desc`) erscheint erst auf der Seite des Bereichs selbst, als
`.section-intro` — so bleibt die Startseite ruhig. Diese Regel gilt schon in der
alten App und wird beibehalten.

### Wenn es mehr oder weniger als acht Module gibt

- **Weniger als acht:** leere Zellen bleiben leer. Kein Platzhalter, keine
  „Demnächst"-Kachel — ein leerer Rasterplatz ist ruhiger als eine graue Box.
  Die Skizze zeigt genau das: drei leere Zellen in der linken Spalte.
- **Mehr als acht:** das Raster wächst nach unten. Das Medaillon bleibt in Zeile
  2, Spalte 2. Ab neun Modulen wird eine vierte Zeile angehängt.
- **Reihenfolge** kommt aus `modules.sort_order` in der Datenbank und ist ohne
  Deploy änderbar.

### Auf schmalen Bildschirmen

Unter 460 px wird das Raster **zweispaltig**, und das Medaillon wandert an den
Kopf über das Raster statt in eine Zelle. Ein Medaillon in einem 2×N-Raster
sitzt nicht mehr „in der Mitte" und wäre sinnlos.

```css
@media (max-width: 460px) {
  .home-grid { grid-template-columns: repeat(2, 1fr); }
  .home-medallion { grid-column: 1 / -1; grid-row: 1; aspect-ratio: auto; }
}
```

---

## 4. Der Leser: zwei Ansichten

Jedes Rezitationsstück kann in zwei Ansichten gelesen werden. Der Umschalter
(`.view-switch`, „Book Version / Study Version") erscheint nur, wenn das Stück
Folio-Angaben hat.

### 4.1 Study Version — die scrollende Ansicht

Ein Vers = eine Karte. Die Verszahl sitzt als goldenes Medaillon in der oberen
Kante der Karte eingekerbt (`top: -0.85rem`, Hintergrund `--surface-page`, damit
sie ein Loch in den Rahmen stanzt).

Reihenfolge im Vers: **arabisch → Umschrift → Übersetzung**. Umschrift und
Übersetzung sind einzeln abschaltbar.

### 4.2 Book Version — die Manuskriptansicht

Ein waagerechter Blätterstapel, der **rechts nach links** blättert:

```css
.ms-book {
  display: flex;
  direction: rtl;                    /* darum blättert es wie ein arabisches Buch */
  overflow-x: auto;
  scroll-snap-type: x mandatory;
}
.ms-sheet { flex: 0 0 100%; scroll-snap-align: center; scroll-snap-stop: always; }
```

**Doppelseite.** Auf großen Querformat-Bildschirmen zeigt die Ansicht zwei
Blätter nebeneinander. Die Umschaltung ist an eine Media-Query gebunden:

```
(min-width: 900px) and (min-height: 600px) and (orientation: landscape)
```

Im Doppelseitenmodus rasten nur die **ungeraden** Blätter ein, sodass ein Wisch
ein ganzes Blattpaar weiterblättert — in RTL ist die Startkante des ungeraden
Kindes seine rechte Kante, was das Paar genau richtig setzt.

**Die Höhenanpassung ist keine CSS-Angelegenheit.** Ein Algorithmus misst nach
dem Rendern alle Blätter, wählt eine gemeinsame Höhe im **80. Perzentil** der
natürlichen Höhen (ohne das Schlussblatt und ohne absichtlich kurze Seiten) und
skaliert dann pro Blatt die Schriftgröße zwischen dem 0,6- und 1,9-fachen der
Basisgröße, bis der Text den Rahmen füllt.

Das muss im Vue-Aufbau als Composable nachgebaut werden und **nach jedem**
dieser Ereignisse neu laufen:

- nach dem Mounten (doppeltes `requestAnimationFrame`)
- nach `document.fonts.ready` — die Metrik der Ersatzschrift ist eine andere
- bei `resize` (150 ms entprellt)
- beim Umschalten von Vollbild
- beim Öffnen und Schließen des Audio-Docks

Ohne diesen Schritt verlieren die Blätter ihre einheitliche Höhe und der Text
füllt den Goldrahmen nicht mehr aus. Das ist der sichtbarste Einzelunterschied
zwischen „sieht aus wie ein Manuskript" und „sieht aus wie Text in einem Kasten".

---

## 5. Globale Modi

Vier Zustände, die als Klassen am Wurzelelement hängen. Es kommen keine weiteren
dazu, ohne dass sie hier eingetragen werden.

| Klasse | Gesetzt von | Was sie schaltet |
|---|---|---|
| `html.dark` | Theme-Umschalter, gespeichert; Startwert aus `prefers-color-scheme` | Den gesamten Tokenblock. Sonst nichts. |
| `html.is-home` | Router, wenn die Startseite aktiv ist | `.topbar { position: static }` — der große Masthead darf wegscrollen |
| `html.immersive` | Vollbildtaste; **Escape** verlässt ihn | Blendet Masthead, Tab-Leiste, Leseleiste, Titel, Chips, Fußzeile aus. Das Blatt geht auf volle Breite, Radius 0. Das Audio-Dock bleibt sichtbar — bewusst. |
| `body.has-player` | Audio-Dock offen | `padding-bottom: var(--player-h)` |

**Wichtig:** Der Dunkelmodus ist ein **Klassenumschalter**, keine reine
Media-Query. Die Wahl der Person hat Vorrang vor der Systemeinstellung. Die
Systemeinstellung liefert nur den Startwert, wenn noch nie gewählt wurde.

Ebenfalls global und nicht wegzulassen:

```css
html { overflow-anchor: none; }
```

Ohne das kämpft die Scroll-Verankerung des Browsers gegen die
Höhenanpassungsläufe der Manuskriptansicht.

---

## 6. Breakpoints

Es gibt **zwei**. Neue werden nicht erfunden.

| Name | Query | Was sich ändert |
|---|---|---|
| `--bp-narrow` | `max-width: 560px` | Kompaktere Polsterung, kleinere Kopfleistenelemente |
| `--bp-tiny` | `max-width: 420px` | Zusätzliche Reduktion in den engsten Fällen |

Dazu zwei **Fähigkeits**-Queries, die keine Breakpoints sind:

```css
@media (hover: hover) { /* Hover-Zustände nur für echte Zeiger */ }
@media (prefers-reduced-motion: reduce) { /* alle Übergänge aus */ }
```

Und eine **Feature**-Query für die Doppelseite (siehe oben).

> **Warum so wenige?** Die App wird zu über 90 % auf Telefonen benutzt, in einer
> einzigen Spalte mit fester Maximalbreite. Das Startraster kommt ohne
> Media-Query aus (`width: calc(33% - gap)` plus `min-width`), und Verse
> skalieren über `--ar-size`. Mehr Breakpoints hieße mehr Zustände zu testen,
> ohne dass jemand sie sähe.

---

## 7. Ebenen

Siehe `01-tokens.md`, Abschnitt 9. Zusammengefasst von unten nach oben:

```
Vers-Lesezeichen (2) → Leseleiste (10) → Suchfeld unten (20)
→ obere Leiste (40) → Vollbild-Schließer / Autoscroll (60)
→ Audio-Dock / Sitzungsbanner (70) → Sprechblase (80) → QR-Overlay (120)
```

Diese Reihenfolge ist durchdacht: das Audio-Dock liegt **über** der
Autoscroll-Leiste, weil beide unten sitzen und das Dock der eingreifendere
Zustand ist. Das Sitzungsbanner liegt über beiden, weil es sagt, dass jemand
anders gerade führt.
