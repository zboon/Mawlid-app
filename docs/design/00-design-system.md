# Das Mawalid Design-System

Dieses Verzeichnis ist die verbindliche Beschreibung des Aussehens der App. Wenn
sich Gestaltung und Code widersprechen, hat dieses Verzeichnis recht und der Code
ist zu korrigieren — nicht umgekehrt.

## Warum es das gibt

Die App soll mehrere sehr verschiedene Bereiche unter ein Dach bringen: eine
Rezitations-Anwendung, eine Sammlung von Vorträgen, eine Ahnenkette, ein Wiki,
Informationsseiten. Ohne festgeschriebene Regeln driften solche Bereiche
auseinander — jeder bekommt seine eigene Kartenform, seinen eigenen Grünton, sein
eigenes Abstandsmaß, und nach einem halben Jahr sieht es aus wie fünf Apps in
einem Gehäuse.

Die Regeln hier sind kein Selbstzweck. Sie sind der Grund, warum ein neuer
Bereich in einem Nachmittag entstehen kann und trotzdem aussieht, als wäre er von
Anfang an dagewesen.

## Die Dokumente

| Datei | Inhalt |
|---|---|
| [`01-tokens.md`](01-tokens.md) | Alle Design-Tokens: Farben, Abstände, Radien, Schatten, Bewegung. Die Zahlen. |
| [`02-typography.md`](02-typography.md) | Schriften, Größen, arabische Typografie, RTL |
| [`03-layout.md`](03-layout.md) | Seitengerüst, Kopfleisten, die Startseite, der Leser |
| [`04-components.md`](04-components.md) | Der Baukasten: Karten, Chips, Leisten, Verse, Manuskriptseite |
| [`05-patterns.md`](05-patterns.md) | Wiederkehrende Muster: Navigation, Suche, Zustände, Leere Zustände |
| [`06-accessibility.md`](06-accessibility.md) | Kontrast, Tastatur, Screenreader, Bewegungsreduktion |
| [`07-adding-a-module.md`](07-adding-a-module.md) | Anleitung: wie ein neuer Bereich aussehen muss |

---

## Die fünf Gestaltungsprinzipien

Diese fünf Sätze sind aus der bestehenden App abgelesen, nicht erfunden. Sie
beschreiben, was dort bereits konsequent getan wird, und machen es zur Regel.

### 1. Der Text ist die Anwendung

Alles andere ist Zubehör. Ein Vers steht in einer weißen Karte auf Papierton, mit
großzügigem Rand und ruhiger Zeilenführung. Die Bedienelemente sitzen an den
Rändern — obere Leiste, untere Leiste — und verschwinden im immersiven Modus
vollständig.

Praktische Folge: **kein Bereich darf mehr als zwei dauerhaft sichtbare
Bedienleisten haben.** Was nicht in Kopf- oder Fußleiste passt, kommt in ein
Blatt (Sheet), das sich öffnet und wieder schließt.

### 2. Zwei Welten: das Grün und das Papier

Die App hat genau zwei Farbwelten, und jede hat ihre eigenen Regeln.

**Das Grün** ist die Rahmung — Kopfleiste, Tab-Leiste, Leseleiste, Docks. Auf
Grün gilt: Vordergrund ist immer `--paper` (elfenbein), Trennlinien sind immer
die goldene Haarlinie `--rule`, Flächen sind durchscheinendes Elfenbein.
`--paper` bleibt deshalb auch im Dunkelmodus hell — es ist dort keine
Hintergrundfarbe, sondern Schriftfarbe auf Grün.

**Das Papier** ist der Inhalt — Seitengrund, Karten, Verse. Auf Papier gilt:
Grün darf nur als `--accent-green` erscheinen (die kontrastgeprüfte Variante),
niemals als `--green`; Gold ist der Akzent; Ränder sind `--paper-edge`.

Die häufigste Gestaltungssünde in dieser App wäre, diese beiden zu vermischen —
etwa `--green` als Textfarbe auf einer Karte. Im Dunkelmodus ist der Kontrast
dann 1,5:1 und die Schrift praktisch unsichtbar. Der Kommentar an
`--accent-green` in der alten CSS sagt genau das.

### 3. Die Manuskriptseite ist ein eigenes Thema, kein Sonderfall

Die Buchansicht (`.ms-*`) bildet ein Pergamentblatt nach: eigener Papierton,
eigene Tinte, eigenes Gold, doppelter Goldrahmen als Inset-Schatten, rote Rosette
als Versteiler. Sie invertiert im Dunkelmodus unabhängig von der übrigen Seite.

Im Neuaufbau wird daraus ein **umbenanntes Thema**, kein zweiter Satz Tokens:
ein `.theme-manuscript`-Block, der dieselben semantischen Namen (`--surface`,
`--ink`, `--rule`, `--accent`) auf andere Werte legt. Alles darin benutzt dann
die normalen Namen und funktioniert automatisch mit.

### 4. Gold trennt, Grün rahmt, Rot markiert

Die Ornamentik folgt einer strengen Zuordnung, die nicht aufgeweicht werden darf:

- **Gold** — Haarlinien, Rahmen, Zahlen, Lesezeichen, aktive Zustände. Gold ist
  das einzige Element, das sowohl auf Grün als auch auf Papier auftreten darf.
- **Grün** — Flächen, die die Anwendung strukturieren.
- **Rot** (`--ms-rosette`) — ausschließlich die Rosette ۞, der Versteiler.
  Sie ist kein Fehlerrot und wird nie für etwas anderes benutzt.
- **Blau/Rosa** — die Sterne im Nahtband. Reines Ornament. (Heute nicht
  gerendert; siehe unten.)

### 5. Nichts springt

Die App wird beim Rezitieren benutzt, oft von mehreren Personen gleichzeitig, oft
im Halbdunkel. Bewegung, die nicht angefordert wurde, ist ein Fehler.

- Übergänge dauern 0,1–0,25 s und betreffen nur `transform`, `opacity`,
  `background`, `border-color`.
- Keine automatischen Karussells, keine einblendenden Overlays, kein Parallax.
- Der Autoscroll ist die einzige selbsttätige Bewegung — und er läuft nur, wenn
  er ausdrücklich gestartet wurde, mit 0,14–0,70 px pro Bild.
- `prefers-reduced-motion` schaltet alle Übergänge ab.

---

## Wie Anpassungen laufen

Damit das System nicht nach dem dritten Bereich zerfällt, gilt eine feste
Reihenfolge. Sie ist absichtlich unbequem an genau der Stelle, an der Abkürzungen
teuer werden.

**Wenn du eine Farbe, einen Abstand oder eine Rundung brauchst:**

1. Steht sie in [`01-tokens.md`](01-tokens.md)? → benutze den Token.
2. Steht sie nicht drin, aber ein vorhandener Token liegt nah? → benutze den
   vorhandenen. Ein zusätzlicher Grünton, der sich um 3 % unterscheidet, ist
   kein Gewinn.
3. Brauchst du wirklich etwas Neues? → **erst hier eintragen, dann benutzen.**
   Mit einer Zeile, wofür er da ist.

**Verboten im Komponenten-Code:**

- Literale Hexwerte oder `rgba()`. Ausnahme: die generierten Alpha-Varianten in
  `tokens.css` selbst.
- `!important`, außer in dokumentierten Ausnahmen (siehe `04-components.md`,
  Abschnitt Rosette).
- Eigene Media-Queries mit neuen Breakpoints. Es gibt zwei, sie stehen in
  [`03-layout.md`](03-layout.md).
- Inline-`style`-Attribute für alles außer wirklich dynamischen Werten
  (Fortschrittsbalken, gemessene Höhen).

**Wenn du das Design grundsätzlich ändern willst** — andere Palette, andere
Schrift: das ist eine Änderung an `tokens.css` und an diesem Verzeichnis, und
sonst nirgends. Wenn eine Palettenänderung Änderungen in Komponentendateien
erzwingt, ist irgendwo Regel 1 verletzt worden, und das ist der eigentliche
Fehler.

---

## Was aus der alten App bewusst übernommen wird

- Die gesamte Farbpalette, Wert für Wert.
- Die drei Schriftstimmen (arabisch / serif / sans) und ihre Zuordnung.
- Der doppelte Goldrahmen der Manuskriptseite.
- Die Eckornamente und die Rosette. (Das Sternenband über der Kopfnaht ist im
  Quelltext vorhanden, wird aber nicht gerendert — beim Neuaufbau ist zu
  entscheiden, ob es zurückkommt.)
- Der Dunkelmodus als Klassenumschalter (nicht als reine Media-Query), damit die
  Wahl der Person Vorrang vor der Systemeinstellung hat.

## Was bewusst geändert wird

- **Abstände, Radien, Schatten und Übergänge werden tokenisiert.** Heute sind es
  42 verschiedene Abstandswerte, 14 Radien und 20 Schattendefinitionen, alle als
  Literale verstreut. Das wird auf je einen kleinen Satz reduziert
  (siehe [`01-tokens.md`](01-tokens.md)).
- **Die 43 `rgba()`-Literale außerhalb von `:root`** werden zu benannten
  Tokens. Sie sind alle Alpha-Varianten vorhandener Farben und reduzieren sich
  auf 31 verschiedene Werte — fünf Stellen benutzen denselben Wert, vier
  weitere denselben Aktivzustand.
- **Die `--ms-*`-Tokens** werden zum umbenannten Thema (Prinzip 3).
- **Drei tote Tokens** (`--star-fill`, `--band-field`, `--star-stroke`) werden
  entweder wiederbelebt oder entfernt. Das Sternenband, das sie färben sollten,
  wird heute gar nicht gerendert: die Konstante `STAR` ist definiert und wird
  nie benutzt.
- **Die Startseite** wird vom umbrechenden Kartenstapel zum festen 3×3-Raster
  mit der Kalligrafie in der Mitte (siehe [`03-layout.md`](03-layout.md)).
