# Einen neuen Bereich hinzufügen

Anleitung und Prüfliste. Wer sie befolgt, bekommt einen Bereich, der aussieht,
als wäre er von Anfang an dagewesen.

---

## Zuerst: brauchst du überhaupt Code?

Die meisten neuen Bereiche brauchen **keinen**. Die Frage ist nur, ob dein
Inhalt in einen vorhandenen Ansichtstyp passt:

| Dein Inhalt | Ansichtstyp | Code nötig? |
|---|---|---|
| Nummerierte Verse zum Rezitieren | `recitation` | nein |
| Beiträge, Vorträge, Aufsätze | `article` | nein |
| Verlinkte Nachschlage-Artikel | `wiki` | nein |
| Personen in einer Kette oder einem Baum | `tree` | nein |
| Audio- oder Videosammlung | `media` | nein |
| Verweis nach außen | `link` | nein |
| Etwas strukturell Neues | neuer Typ | **ja** |

**Wenn „nein":** Modul in der Datenbank anlegen, Inhalt einpflegen, fertig.
Siehe `docs/architecture/02-modules.md`, Fall A. Ab hier musst du nicht
weiterlesen.

**Wenn „ja":** weiter unten.

---

## Ein Bereich sieht falsch aus, wenn …

Das sind die Fehler, die einen neuen Bereich sofort als angeflanscht verraten.
Jeder einzelne ist schon einmal irgendwo passiert.

| Fehler | Warum es sofort auffällt |
|---|---|
| Eigene Kopfleiste gebaut | Die Bismillah sitzt nicht mehr auf derselben Höhe |
| Eigene Kartenform | Radius, Rand oder Schatten weichen minimal ab — und genau das sieht man |
| Ein neues Grün „das besser passt" | Es gibt zwei Grüntöne, und beide haben einen Grund |
| `letter-spacing` auf arabischem Text | Die Ligaturen brechen auf, das Wort zerfällt |
| Ein eigener Abstand statt der Skala | Der Bereich hat einen anderen Seitenrand als alles andere |
| Kein Dunkelmodus getestet | Grüner Text auf dunkler Karte, 1,5:1, unsichtbar |
| Kein Leer- und kein Fehlerzustand | Eine leere Liste sieht aus wie ein Absturz |
| Eigene Suche | Ergebnisse tauchen woanders und anders formatiert auf |
| Icons in den Startkacheln | Die Startseite ist Typografie, keine Symbolsammlung |

---

## Neuer Ansichtstyp — Schritt für Schritt

### 1 · Struktur festlegen

Bevor du etwas baust, beantworte diese Fragen schriftlich:

- Was ist die kleinste Einheit? (Ein Vers? Ein Absatz? Eine Person?)
- Wie ist sie geordnet — Reihenfolge, Datum, Hierarchie?
- Gibt es Übersetzungen? Welche Rollen (Original, Umschrift, Übersetzung)?
- Wie sieht die Liste aus, wie die Einzelansicht?
- Was gehört in die globale Suche?

Passt die Antwort in `articles` oder `works`, brauchst du keinen neuen Typ.
Braucht sie neue Tabellen, dann leg sie an — aber orientiere dich an dem
Muster `entity` + `entity_translations`.

### 2 · Verzeichnis anlegen

```
src/modules/<typ>/
  index.ts          erfüllt den ModuleDefinition-Vertrag
  IndexView.vue     Übersicht des Moduls
  ListView.vue      Liste innerhalb einer Sammlung
  DetailView.vue    ein einzelnes Element
  components/       nur was WIRKLICH nur hier vorkommt
  composables/
```

**In `components/` gehört nur, was nirgends sonst auftaucht.** Wenn du eine
Karte, einen Chip oder eine Leiste baust: erst in `src/components/` schauen.

### 3 · Den Vertrag erfüllen

```ts
// src/modules/tree/index.ts
import type { ModuleDefinition } from '@/modules/types'

export default {
  IndexView:  () => import('./IndexView.vue'),
  ListView:   () => import('./ListView.vue'),
  DetailView: () => import('./DetailView.vue'),
  search: async (q) => { /* … oder weglassen */ },
} satisfies ModuleDefinition
```

Und in `src/modules/registry.ts` eintragen.

### 4 · Gerüst benutzen, nicht bauen

```vue
<template>
  <IndexLayout>            <!-- bringt Masthead, Tab-Leiste, main mit -->
    <SectionIntro :text="module.description" />
    <ContentCard v-for="item in items" :key="item.slug" … />
    <EmptyState v-if="!items.length" :message="t('tree.empty')" />
  </IndexLayout>
</template>
```

`IndexLayout` und `ReaderLayout` sind die beiden erlaubten Gerüste. Es gibt kein
drittes, und du baust auch keins.

### 5 · Styles

```vue
<style scoped>
.node {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  padding: var(--pad-row);
  gap: var(--space-sm);
}
.node-name  { font-family: var(--font-arabic); color: var(--ink-arabic); }
.node-dates { font-size: var(--text-xs); color: var(--ink-soft); }
</style>
```

**Kein einziger literaler Wert.** Kein `#`, kein `rgba(`, kein `px` für Abstände
oder Schrift. Der Linter meldet es; besser, du meldest es dir selbst.

### 6 · Mehrsprachigkeit

Alle Beschriftungen in `src/i18n/*.json`, keine festen Zeichenketten im Markup.
Auch die arabische Hälfte zweisprachiger Beschriftungen bekommt einen eigenen
Schlüssel.

### 7 · An die Suche anschließen

Wenn dein Modul durchsuchbar sein soll, implementiere `search()` und liefere das
Standard-Trefferformat. Die globale Suche fügt deine Gruppe automatisch ein.

> Das ist genau der Schritt, der bei Al-Aḥzāb in der alten App vergessen wurde —
> 950 Verse, die in der Suche nicht vorkommen, weil eine Zeile in einer
> Aufzählung fehlt.

---

## Die Prüfliste

Vor dem Merge, ehrlich durchgehen:

### Aussehen

- [ ] `IndexLayout` oder `ReaderLayout` benutzt, keine eigene Kopfleiste
- [ ] Alle Farben aus `01-tokens.md`, kein literaler Wert
- [ ] Alle Abstände aus der Skala, Seitenrand `--space-xl`
- [ ] Radien aus der Radienliste
- [ ] Nur die drei Schriftstimmen
- [ ] Kein `letter-spacing` auf arabischem Text
- [ ] Karten sind `ContentCard`, nicht selbstgebaut
- [ ] Kein Icon in der Startkachel

### Themen und Richtung

- [ ] Im hellen **und** im dunklen Thema geprüft
- [ ] Kontrast erfüllt AA in beiden
- [ ] Logische Eigenschaften (`margin-inline-start` statt `margin-left`)
- [ ] Arabischer Text hat `dir="rtl"` und `lang="ar"`

### Zustände

- [ ] Ladezustand (`SkeletonCard`)
- [ ] Leerzustand (`EmptyState`) mit brauchbarem Satz
- [ ] Fehlerzustand (`ErrorState`) mit „Erneut versuchen"
- [ ] `:active` an allem Antippbaren
- [ ] `:focus-visible` an allem Bedienbaren

### Verhalten

- [ ] Zurück-Knopf tut das Erwartete
- [ ] Zustand steht in der URL, wo er hingehört
- [ ] Zum Suchergebnis springen funktioniert (falls durchsuchbar)
- [ ] Nur mit Tastatur bedienbar
- [ ] Bei `prefers-reduced-motion` keine Animation

### Daten

- [ ] Alle Beschriftungen über i18n
- [ ] Zählwert kommt aus der Datenbank, nicht aus einer Fallunterscheidung
- [ ] Entwurf/Veröffentlicht wird beachtet
- [ ] Modul lässt sich über `is_published` verstecken

### Dokumentation

- [ ] Neuer Ansichtstyp in `02-modules.md` eingetragen
- [ ] Neue gemeinsame Komponente in `04-components.md` eingetragen
- [ ] Neuer Token in `01-tokens.md` eingetragen — **vor** der Benutzung

---

## Das Beispiel: Silsila

Zur Veranschaulichung, was ein neuer Ansichtstyp konkret bedeutet.

**Was es ist:** eine Kette von Lehrern, jeder mit Namen (arabisch und
lateinisch), Lebensdaten und einem kurzen Text. Die Kette kann sich verzweigen.

**Warum ein neuer Typ:** Weder eine Liste noch ein Artikelbaum zeigt die Kette
als Kette. Die Beziehung *ist* der Inhalt.

**Was es trotzdem teilt:**

- Kopfleiste, Tab-Leiste, Seitenrand, Breitenbegrenzung
- `ContentCard` in der Listenansicht
- Alle Tokens, alle Schriftstimmen
- Leer-, Lade-, Fehlerzustand
- Die globale Suche

**Was es eigen hat:**

- Eine Kettenansicht mit Verbindungslinien zwischen den Knoten (Linien in
  `--accent-line-soft`, Knoten wie eine `ContentCard`)
- Lebensdaten in Hijri **und** gregorianisch, wie in den Dalāʾil-Daten
  (`807–870 هـ / 1404–1465 م`)
- Sprung zu Werken der Person (`article_works`)

**Was es nicht tut:**

- Keine eigene Kopfleiste
- Keine Fotos von Personen (dazu gibt es einen guten Grund im Kontext dieser App)
- Kein eigener Grünton für „Kettenlinien"
