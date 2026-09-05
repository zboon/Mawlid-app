# Frontend

Vue 3, TypeScript, Vite. Wie die Anwendung aufgebaut ist und welche Muster
gelten.

---

## 1 · Zustand: wo was hingehört

Die alte App hat **ein** globales `state`-Objekt mit vierzehn Feldern, das alles
enthält — von der Schriftgröße bis zum aktuellen Tab. Das ist der Grund, warum
jede Änderung `renderIndex()` auslöst und dabei die Leseposition verliert.

Im Neuaufbau gibt es vier klar getrennte Orte:

| Wo | Was | Werkzeug |
|---|---|---|
| **URL** | Wo bin ich: Modul, Sammlung, Werk, Vers, Suchbegriff | Vue Router |
| **Server-Cache** | Inhalte aus der API | TanStack Query |
| **Pinia** | Was geräteweit gilt: Theme, Anzeigeoptionen, Auth, Live-Sitzung | Pinia |
| **Komponente** | Was nur hier zählt: offen/zu, Eingabefeld | `ref` |

**Die Regel:** Bevor etwas in einen Pinia-Store wandert, prüfen, ob es nicht in
die URL gehört. Alles, was jemand teilen oder mit dem Zurück-Knopf wiederfinden
können soll, gehört in die URL.

Der Suchbegriff ist das beste Beispiel. Heute ist er `state.query` und beim
Zurückgehen weg (Befund B5). Als `?q=` in der URL ist er teilbar und
überlebt den Zurück-Knopf ohne Zutun.

### Die Stores

```
stores/
  theme.ts     hell/dunkel, aus localStorage, Startwert prefers-color-scheme
  display.ts   showTr, showEn, arScale, latinScale, pageView, spread,
               scrollSpeed  ← werden gespeichert, heute gehen sie verloren
  auth.ts      Benutzer, Rolle, Geräte-ID
  session.ts   Live-Sitzung: führend / folgend / aus
  personal.ts  Favoriten, Lesepositionen, Markierungen (lokal + Server)
```

---

## 2 · Composables

Sie ersetzen die ~60 globalen Funktionen der alten App. Jedes kapselt **ein**
Verhalten samt seinem Zustand und seiner Aufräumlogik.

### `useManuscriptFit(bookRef)`

Der wichtigste und heikelste. Die Höhen der Manuskriptblätter sind kein
CSS-Ergebnis, sondern ein Mess- und Anpassdurchlauf. Ohne ihn verlieren die
Blätter ihre einheitliche Höhe und der Text füllt den Goldrahmen nicht.

**Der Algorithmus** (unverändert aus `msAutoFit()` übernehmen):

1. Alle Inline-Schriftgrößen zurücksetzen, `min-height: 0; height: auto`
   setzen — sonst verdeckt die CSS-Untergrenze, wie hoch der Text wirklich ist
2. Natürliche Höhe und Basisschriftgröße je Blatt messen
3. **Eine gemeinsame Höhe** für das ganze Kapitel wählen: das **80. Perzentil**
   der natürlichen Höhen, **ohne** das Schlussblatt und **ohne** absichtlich
   kurze Blätter
4. Untergrenze: im Vollbild `innerHeight − Abspielerhöhe`, sonst
   `min(innerHeight × 0.72, Blattbreite × 1.5)`
5. Je Blatt die Schriftgröße zwischen `basis × 0.6` und `basis × 1.9` anpassen,
   startend bei `basis × √((Texthöhe + Rest) / Texthöhe)`, dann zwei Schleifen
   mit höchstens 30 Durchläufen gegen die echte Geometrie

**Er muss neu laufen bei:**

```ts
onMounted(() => requestAnimationFrame(() => requestAnimationFrame(fit)))
document.fonts.ready.then(fit)              // Ersatzschrift hat andere Metrik
useResizeObserver(bookRef, debounce(fit, 150))
watch(() => display.immersive, fit)
watch(() => player.height, fit)
```

Der Aufruf nach `document.fonts.ready` ist kein Detail: vor dem Laden von Amiri
misst man eine andere Schrift, und die Blätter sitzen falsch.

> Die alte App hat außerdem `msReflowOverflow()` — ein Sicherheitsnetz, das
> Überhang auf ein neues Blatt schiebt. Es wird **nie aufgerufen** (Befund B7e).
> Beim Neuaufbau entscheiden, ob es gebraucht wird; wenn ja, richtig anbinden.

### `useAutoScroll()`

Neun Stufen von 0,14 bis 0,70 px pro Bild, beschriftet 0,2× bis 1×.

Zwei Punkte, die man leicht falsch macht:

```ts
function step() {
  if (!active.value) return
  // Geschwindigkeit JEDES BILD neu lesen — sonst greift eine Änderung erst
  // nach einem Neustart der Schleife.
  accum += SPEEDS[display.scrollSpeedIdx]
  if (accum >= 1) {
    const dy = Math.floor(accum); accum -= dy
    window.scrollBy(0, dy)
    if (atBottom()) { stop(); return }     // am Ende selbsttätig anhalten
  }
  raf = requestAnimationFrame(step)
}
```

Beim Verlassen der Route wird gestoppt (`onBeforeUnmount`). Die alte App tut das
über `stopAutoScroll()` in jedem Navigationsweg — leicht zu vergessen.

### `useReaderBar()`

Der Schlank-Modus mit **Hysterese**:

```ts
const SLIM_ON = 88, SLIM_OFF = 32
// Eine einzige Schwelle lässt die Bismillah mehrmals pro Sekunde blinken:
// Leiste klappt ein → Inhalt rutscht hoch → Dokument wird kürzer →
// scrollY fällt unter die Schwelle → Leiste klappt aus → …
```

Gemessen wird in `requestAnimationFrame`, nicht bei jedem Scroll-Ereignis.

### Die übrigen

| Composable | Aufgabe |
|---|---|
| `useReadingPosition(workSlug)` | Speichern und Wiederfinden der Lesestelle |
| `useVerseMarks(workSlug)` | Markierte Phrasen |
| `useFavorite(workSlug)` | Lesezeichen umschalten |
| `useSearch()` | Entprellte Suche, Trefferaufbereitung |
| `useLiveSession()` | WebSocket, Führen/Folgen |
| `useAudioDock()` | Abspieler, Downloads, Cache Storage |
| `useImmersive()` | Vollbild, Escape verlässt |
| `useArabicText()` | Rosetten, Segmente, Zeilenumbrüche |

---

## 2a · Stand nach Phase 3 — was davon steht, und unter welchem Namen

Der Entwurf oben ist der Plan. Gebaut wurde er mit drei Abweichungen bei den
Namen und einer bei der Aufteilung. Wer den Code sucht, findet ihn so:

| Entwurf | Gebaut | Wo |
|---|---|---|
| `useManuscriptFit(bookRef)` | `useManuscriptFit(bookRef, deps)` | `composables/useManuscriptFit.ts` |
| `useAutoScroll()` | unverändert | `composables/useAutoScroll.ts` |
| `useReaderBar()` | **`useSlimBar()`** | `composables/useSlimBar.ts` |
| `useImmersive()` | **im Reader-Store** | `stores/reader.ts` |
| `useArabicText()` | **`tokenize()` + `VerseText.vue`** | `lib/text.ts` |
| — | **`useSpread()`** (Doppelseite) | `composables/useSpread.ts` |
| — | **`useGlossBubble()`** (goldene Glosse) | `composables/useGlossBubble.ts` |
| — | **`buildLeaves()`** (Blätter aus `‖`) | `lib/pages.ts` |

**Warum `useSlimBar` und nicht `useReaderBar`:** das Composable kennt nur den
Scrollstand und die beiden Schwellen. Es weiß nichts über eine Leiste. Ein
Name, der mehr verspricht, als das Ding kann, führt beim nächsten Lesen in die
Irre.

**Warum Vollbild in den Store gehört:** es ist geteilter Zustand. Die Leseleiste
zeigt danach andere Knöpfe, `useManuscriptFit` rechnet mit einer anderen
Untergrenze, und die globalen CSS-Regeln hängen an `html.immersive`. Ein
Composable hätte drei Kopien desselben Zustands erzeugt.

**Warum `tokenize()` eine Funktion ist und kein Composable:** sie hat keinen
Zustand und keinen Lebenszyklus. Sie nimmt eine Zeichenkette und gibt eine
Liste von Marken zurück — reine Abbildung, damit prüfbar ohne DOM.

### Der Verstext wird nicht als HTML gerendert

`tokenize()` liefert Marken (`text`, `rosette`, `break`, `gloss`), die
`VerseText.vue` mit `v-for` setzt. Kein `v-html`.

Das ist kein Purismus: der Text kommt aus der Datenbank und wird ab Phase 6
über eine Redaktionsoberfläche bearbeitet. Ein `v-html` darauf wäre genau die
Stelle, an der eingefügtes Markup ausgeführt würde. Mit Marken bleibt es Text,
und Vue entschärft jedes Zeichen von selbst.

### Die Rosette ist ein SVG, kein Zeichen

Die Textschrift bildet ۞ auf ein leeres Platzhalterglyph ab — es erschiene als
schwarzer Klotz. Die alte App wich auf ein Hintergrundbild aus, als Daten-URI,
der keine CSS-Variable lesen kann, also **zweimal**, einmal je Thema. Als
Inline-SVG-Komponente (`icons/IconRosette.vue`) mit den Ornament-Tokens ist es
ein Bild, das dem Thema folgt.

### `msReflowOverflow` wurde nicht nachgebaut

Das Sicherheitsnetz aus Befund B7e wird in der alten App nie aufgerufen. Es
wurde deshalb nicht übernommen. Beobachtet wurde in Phase 3 auch kein Fall, in
dem es gebraucht worden wäre: `useManuscriptFit` verkleinert die Schrift bis
`basis × 0.6`, und bei 272 Blättern trat kein Überhang auf. Sollte er je
auftreten, ist die richtige Antwort ein zusätzliches `‖` im Text — also eine
redaktionelle, keine algorithmische.

---

## 3 · Arabischen Text darstellen

Die alte App setzt HTML als Zeichenkette zusammen und schreibt es per
`innerHTML` in die Seite:

```js
function segWrap(s, rosClass) {
  // teilt an ۞ und ، , umschließt jedes Stück mit <span class="seg" data-sg="…">
}
```

**In Vue wird daraus eine Komponente**, kein `v-html`. Das ist wichtiger, als
es klingt: bei redaktionell pflegbarem Text ist `v-html` eine Einladung zu
Cross-Site-Scripting.

```vue
<!-- ArabicVerse.vue -->
<script setup lang="ts">
const props = defineProps<{
  body: string
  segmented?: boolean       // Segmente antippbar machen
  marks?: Set<number>
  placed?: number | null
}>()

/** Teilt an ۞ und ، in Segmente — dieselbe Logik wie segParts(). */
const segments = computed(() => splitSegments(props.body))
</script>

<template>
  <p class="v-ar" dir="rtl">
    <template v-for="(seg, i) in segments" :key="i">
      <span
        class="seg"
        :class="{ marked: marks?.has(i), placed: placed === i }"
        @click="segmented && $emit('mark', i)"
      >{{ seg.text }}</span>
      <Rosette v-if="seg.rosetteAfter" />
    </template>
  </p>
</template>
```

**Warum es Segmente überhaupt gibt:** Sie sind die Antippflächen zum Markieren
und für die Leseposition. Ein Vers kann sehr lang sein — man will die Stelle
innerhalb des Verses merken, nicht nur den Vers.

**Zeilenumbrüche:** `\n` im Text wird zu `<br>`. In Vue über `white-space:
pre-line` oder durch Aufteilen — nicht über `v-html`.

**`‖` (U+2016)** wird vor der Anzeige entfernt (das tut `stripBreaks()`). Es
bleibt in der Datenbank stehen, weil es Umbruchinformation trägt.

---

## 4 · Mehrsprachigkeit

Zwei Dinge, die man nicht verwechseln darf:

| | Wo | Womit |
|---|---|---|
| **Oberflächentexte** | Frontend, `src/i18n/*.json` | `vue-i18n` |
| **Inhaltsübersetzungen** | Datenbank | `?lang=` an der API |

Sie sind **unabhängig**. Jemand kann die Oberfläche auf Deutsch haben und
englische Übersetzungen lesen — das ist sogar der wahrscheinliche Fall, solange
es keine deutschen Übersetzungen gibt.

```
src/i18n/
  de.json    ← Ausgangssprache
  en.json
  ar.json
  tr.json
```

```ts
// Sprache bestimmt auch die Richtung der Oberfläche.
watch(locale, (l) => {
  document.documentElement.lang = l
  document.documentElement.dir = LANGS[l].direction   // 'rtl' bei Arabisch
})
```

Weil die Oberfläche irgendwann auf Arabisch stehen kann, gilt ab sofort:
**logische CSS-Eigenschaften** statt physischer
(`margin-inline-start` statt `margin-left`). Siehe
`docs/design/02-typography.md` §7.

---

## 5 · Was aus welcher alten Funktion wird

| Alt | Neu |
|---|---|
| `renderIndex()` | Router + Ansichten |
| `readerHTML()` | `ReaderLayout.vue` |
| `openQasida()` … `openLitany()` (9 Stück) | eine Route `/m/:module/:collection/:work` |
| `selectTab()` | `router.push()` |
| `goBack()` mit `TAB_CHILDREN`-Rückwärtssuche | Router-Verlauf |
| `state.showTr` / `showEn` | `display`-Store |
| `toggleFav()` / `updateFavUI()` | `useFavorite()` |
| `startAutoScroll()` / `stopAutoScroll()` | `useAutoScroll()` |
| `msAutoFit()` | `useManuscriptFit()` |
| `normalize()` / `tighten()` | `packages/shared/src/normalize.mjs` |
| `segWrap()` / `withRosettes()` | `ArabicVerse.vue` |
| `onclick="…"` in HTML-Strings | `@click` |
| `document.documentElement.classList.toggle('dark')` | `theme`-Store |

---

## 6 · Leistung

Die alte App lädt 2,4 MB in einem Stück und ist danach sofort vollständig da.
Die neue lädt weniger, aber öfter. Damit sich das nicht schlechter anfühlt:

- **Route-basiertes Aufteilen.** Jeder Ansichtstyp ist ein eigenes Bündel. Wer
  nie ins Wiki geht, lädt den Wiki-Code nicht.
- **Schriften mit `preload` und `font-display: swap`.** Die arabischen Schriften
  sind ~830 KB; sie dürfen das erste Rendern nicht blockieren.
- **`stale-while-revalidate`.** Ein zuvor geöffnetes Werk erscheint sofort aus
  dem Query-Cache und aktualisiert sich im Hintergrund.
- **Virtualisierung nur, wenn nötig.** Der längste Text hat 213 Verse. Das
  rendert jeder Browser ohne Hilfe. Virtualisierung würde die Sprungfunktion und
  die Höhenanpassung des Manuskripts erheblich verkomplizieren — nicht machen,
  bevor es weh tut.
- **Bilder als SVG, wo möglich.** Die beiden Kalligrafien sind heute PNGs von
  ~54 KB und ~50 KB. Als SVG wären sie kleiner, scharf und themenfähig.

---

## 7 · Testen

| Ebene | Womit | Was |
|---|---|---|
| Einheit | Vitest | `normalize()`, Segmentteilung, Folio-Zuordnung, Perzentilrechnung |
| Komponente | Vitest + Testing Library | Verskarte in allen Varianten, Chip-Zustände, Karte |
| End-zu-Ende | Playwright | Lesen, Suchen, Favorit setzen, Ansicht wechseln, Dunkelmodus |

**Die wichtigsten Tests sind nicht die offensichtlichen:**

1. **Normalisierungs-Gleichheit.** Eine Tabelle mit 40 Begriffen — arabisch, in
   Umschrift, englisch, mit Tippfehlern — und die erwartete Trefferliste. Wenn
   dieser Test grün ist, verhält sich die Suche wie vorher.

2. **Zeichentreue.** Für Stichproben aus jeder Sammlung: der Text, der auf dem
   Bildschirm landet, ist bytegleich mit dem in der Datenbank. Kein verlorenes
   Harakat, keine verschluckte Rosette.

3. **Die Manuskripthöhen.** Bei gegebener Blattbreite und Textlänge ergibt der
   Algorithmus dieselbe gemeinsame Höhe wie die Referenzimplementierung.
