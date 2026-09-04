# Muster

Wiederkehrende Lösungen. Wenn ein Modul eine dieser Situationen hat, benutzt es
das Muster — es erfindet keine zweite Lösung.

---

## 1 · Navigation

### Die Hierarchie

```
Startseite  →  Modul  →  Sammlung  →  Werk
```

Höchstens vier Ebenen. Wer eine fünfte braucht, hat den Inhalt falsch
geschnitten.

### Ausgänge

| Ebene | Was oben links steht |
|---|---|
| Startseite | nichts |
| Modul | Home |
| Sammlung | Home + Zurück |
| Werk (Leser) | nur „‹ Zurück" — der Leser hat keine Kopfleiste |

Die Tab-Leiste erscheint auf Modul- und Sammlungsebene, **nie** auf der
Startseite und **nie** im Leser.

### Ein Hub bleibt aktiv

Ist man in einer Sammlung, bleibt der Tab des Moduls hervorgehoben. Das ist
heute die Konstante `TAB_CHILDREN`; künftig ergibt es sich aus der Route.

---

## 2 · Suche

### Ein Feld, alles durchsuchen

Die Suche greift **immer über die gesamte App**, egal von wo aus getippt wird.
Das ist eine bewusste Entscheidung der alten App und wird beibehalten: Wer eine
Zeile im Ohr hat, weiß meist nicht, in welcher Sammlung sie steht.

### Wo das Feld sitzt

| Seite | Position |
|---|---|
| Startseite | **fest am unteren Bildschirmrand**, mit stärkerem Schatten |
| Alle anderen | oben im Fluss, unter der Tab-Leiste |

Unten auf der Startseite ist kein Zufall: dort ist es mit dem Daumen erreichbar,
und die Kalligrafie oben bleibt unangetastet.

### Ergebnisse

Nach Modulen gruppiert, in der Reihenfolge der Module. Je Gruppe eine
Überschrift zweisprachig („Dalāʾil al-Khayrāt · دلائل الخيرات").

Unter jeder Karte bis zu **sechs** Trefferzeilen mit Kontext, darunter „+N
weitere Zeilen in dieser Lesung". Ein Tippen springt zum Vers und lässt ihn kurz
aufblitzen.

### Ohne Treffer

```
Keine Treffer für „xyz". Versuch eine andere Schreibweise.
```

Der Hinweis auf die Schreibweise ist wichtig, weil die Suche unscharf ist und
Menschen Umschriften unterschiedlich schreiben.

---

## 3 · Zustände einer Liste

Vier, immer alle vier bedenken:

| Zustand | Darstellung |
|---|---|
| **Lädt** | `SkeletonCard` ×3 |
| **Hat Inhalt** | Die Karten |
| **Leer** | `EmptyState` mit einem Satz, der sagt, wie es sich füllt |
| **Fehler** | `ErrorState` mit „Erneut versuchen" |

> Der Lade- und der Fehlerzustand sind **neu**. Die alte App hat alle Daten im
> HTML — es gibt dort weder Warten noch Netzfehler. Mit ADR-004 (online-first)
> sind beide keine Randfälle, sondern Alltag. Wer sie vergisst, zeigt einer
> Person mit schlechtem Netz eine leere Liste, die aussieht, als wären ihre
> Texte weg.

### Leere Zustände formulieren

Kein Marketing, keine Illustration. Ein Satz, der erklärt, wie sich das füllt:

- Favoriten: *„Noch keine Favoriten. Öffne einen Text und tippe auf das
  Lesezeichen neben dem Titel."*
- Ein Bereich ohne Inhalt: *„Hier ist noch nichts."*
- Suche: *„Keine Treffer für „…". Versuch eine andere Schreibweise."*

---

## 4 · Umschalter

Drei Bauformen, klar getrennte Zuständigkeiten:

| Form | Wofür | Beispiel |
|---|---|---|
| **Chip an/aus** | Etwas ein- oder ausblenden | Umschrift, Übersetzung |
| **Segmentschalter** | Zwei sich ausschließende Zustände, beide benannt | Buchansicht / Leseansicht |
| **Ikonen-Schalter** | Ein Zustand, offensichtlich | Vollbild, Theme, Lesezeichen |

**Regel:** Ein Aus-Zustand darf **nie** allein durch Deckkraft angezeigt werden.
Die alte App hat das versucht und es zurückgenommen — auf dunklem Grund war es
unlesbar. Deshalb wechselt bei `.chip.off` zusätzlich die Farbe.

---

## 5 · Zweisprachige Beschriftungen

Fast jede Beschriftung in der App steht doppelt: lateinisch und arabisch.

```
Wähle einen Text · اختر نصاً
```

**Regeln:**

- Trenner ist ` · ` (U+00B7 mit Leerzeichen), nicht Bindestrich oder Schrägstrich
- Die lateinische Hälfte steht zuerst, weil die Oberfläche LTR ist
- Der arabische Teil bekommt **niemals** `letter-spacing`
- Beide kommen aus derselben i18n-Datei, nicht als zusammengesetzte Zeichenkette

```json
{
  "collection.choose": "Wähle einen Text",
  "collection.choose.ar": "اختر نصاً"
}
```

Das getrennte Halten ist wichtig: sobald die Oberfläche arabisch ist, entfällt
die Doppelung ganz und es bleibt nur der arabische Teil.

---

## 6 · Zählwerte

Auf jeder Startkachel steht eine kleine goldene Zeile in Versalien: „15 Teile",
„3 Sammlungen", „Noch nichts gespeichert", „Demnächst".

**Regeln:**

- Immer eine echte Zahl, wenn es Inhalt gibt
- „Demnächst" nur bei einem Bereich, der wirklich kommt
- Bei leerem Bereich der Grund, nicht „0 Einträge"
- Der Wert kommt aus der Datenbank (`v_collection_counts`), nicht aus einer
  Fallunterscheidung im Code

> Genau so eine Fallunterscheidung ist heute die Fehlerquelle: `sectionCount()`
> fällt für unbekannte Bereiche auf die Favoritenzahl durch und `countLabel()`
> auf „N ilahis". Ein neuer Bereich mit einem Tippfehler zeigt dann „3 ilahis".

---

## 7 · Der Leser

### Der Aufbau steht fest

```
Leseleiste
Titel arabisch
Titel lateinisch
[Hinweisbanner, falls vorhanden]
Chips
Verse
Autoscroll-Leiste
```

Diese Reihenfolge ändert sich nicht — auch nicht in einem neuen Modul.

### Der Vers

```
arabisch (oder Original)
Umschrift
Übersetzung
```

Immer diese Reihenfolge. Umschrift und Übersetzung sind einzeln abschaltbar;
das Original nie.

### Vollbild

Blendet **alles** aus außer dem Text und dem Audio-Dock. Escape verlässt.

Dass das Dock bleibt, ist Absicht: wer im Vollbild rezitiert, will die Aufnahme
weiterhin steuern können.

---

## 8 · Lesezeichen und Position

Zwei verschiedene Dinge, die man nicht verwechseln darf:

| | Was es ist | Wo es sitzt |
|---|---|---|
| **Favorit** | „Das will ich wiederfinden" | Lesezeichensymbol in der Leseleiste |
| **Leseposition** | „Bis hierhin bin ich gekommen" | Kleines Symbol oben links **in der Verskarte** |

Der Favorit gilt dem ganzen Werk. Die Position gilt einem Vers, genauer sogar
einem Segment innerhalb des Verses.

Die Position ist **je Werk eine** — heute gibt es sie nur einmal für die ganze
App und nur für die Dalāʾil, was die offensichtliche Verbesserung ist.

Die markierte Verskarte trägt ein 3 px breites Goldband am inneren Rand.

---

## 9 · Medien

### Video

YouTube-Einbettung. Der Ausschnitt kommt aus `start_seconds` / `end_seconds`.

> `<meta name="referrer" content="strict-origin-when-cross-origin">` ist
> **erforderlich**. Ohne Referrer weigert sich der YouTube-Player, sich zu
> konfigurieren (Fehler 153). In einer installierten PWA ist der
> Browser-Standard nicht verlässlich, deshalb steht es ausdrücklich da.

### Audio

Ein echtes `<audio>`-Element, kein YouTube-Rahmen. Drei Gründe: es läuft im
Hintergrund weiter, die Geschwindigkeit ist feiner regelbar, und es lässt sich
herunterladen.

Das Dock sitzt unten, über allem anderen, und bleibt im Vollbild sichtbar.

### Heruntergeladene Aufnahmen

Sie liegen in einem **eigenen Cache ohne Versionsnummer**. Der Service Worker
räumt bei jedem Update alle Caches außer dem aktuellen ab — hätte der
Audio-Cache eine Version, verschwänden bei einer Tippfehlerkorrektur 150 MB.

Das gilt für jeden künftigen Cache: **wer etwas Teures cacht, gibt ihm keinen
Versionsnamen und trägt ihn in die Ausnahmeliste ein.**

---

## 10 · Was es nicht gibt

Damit niemand danach sucht — und damit niemand es einführt, ohne es hier
einzutragen:

| Nicht vorhanden | Warum |
|---|---|
| Modaldialoge (außer QR) | Was mehr Platz braucht, ist eine eigene Route |
| Tooltips | Auf Touch nutzlos |
| Karussells | Bewegung, die niemand angefordert hat |
| Ausklapper im Leser | Ein Vers klappt nicht zu |
| Ladebalken oben | Skeletons sind ehrlicher |
| Unendliches Nachladen | Die längste Liste hat 25 Einträge |
| Zustimmungsbanner | Es gibt kein Tracking |
