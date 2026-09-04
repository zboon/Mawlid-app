# Das Modulsystem

Wie „verschiedene Applikationen in einer Applikation" konkret funktioniert.

---

## Das Problem

Die App soll Dalāʾil al-Khayrāt, Mawlid-Texte, eine Silsila, Sohbets, ottomanische
Geschichte, ein Wiki und Informationsseiten unter ein Dach bringen. Diese Dinge
sind sehr verschieden: ein Vers hat eine Nummer, eine Umschrift und eine
Übersetzung; ein Sohbet hat ein Datum und einen Sprecher; eine Silsila ist eine
Kette von Personen; ein Wiki-Artikel verweist auf andere Artikel.

Wenn jeder Bereich seine eigene Struktur, seine eigenen Karten und seine eigene
Navigation bekommt, hat man nach dem dritten Bereich fünf Apps in einem Gehäuse.
Wenn man alles in ein einziges Schema presst, wird jeder Bereich zur Verrenkung.

---

## Die Antwort: Module + Ansichtstypen

**Ein Modul** ist ein Bereich. Es ist ein Datensatz:

```
modules
  slug         'dalail'
  view_type    'recitation'
  sort_order   2
  is_published 1
```

**Ein Ansichtstyp** sagt, welche Vue-Ansicht die Inhalte darstellt. Es gibt
davon wenige, und sie werden selten mehr.

```
Modul (Daten)  ──benutzt──▶  Ansichtstyp (Code)
```

Der Trick ist die Zahl: **viele Module, wenige Ansichtstypen.** „Ottoman" und
„Sohbets" sind beide Artikelsammlungen — sie brauchen keinen eigenen Code,
sondern nur eigene Daten.

---

## Die Ansichtstypen

### `recitation`

Werke mit nummerierten Versen. Lese- und Buchansicht, Autoscroll, Umschrift und
Übersetzung umschaltbar, Schriftgröße, Favoriten, Leseposition, Markierungen.

**Datenpfad:** `collections → works → verses → verse_texts`, dazu `folios`,
`media`, `schedules`, `sequences`.

**Module heute:** Dalāʾil, Mawlid, Al-Aḥzāb, Qasidas, Ilahis.

Das ist der aufwendigste Typ und praktisch die gesamte heutige App.

### `article`

Fließtext in Markdown, mit Überschriften, Bildern, Zitaten. Optional Datum,
Autor, Medienanhang. Liste oder Zeitleiste.

**Datenpfad:** `articles → article_translations`.

**Module:** Sohbets, Ottoman, Info-Seiten.

### `wiki`

Wie `article`, plus:
- Querverweise zwischen Artikeln (`article_links`)
- Rückverweise („was zeigt hierher?")
- Verknüpfung zu Rezitationswerken (`article_works`)
- Eigene Volltextsuche über Artikel

**Module:** Wiki.

### `tree`

Hierarchie mit Personen: Lebensdaten, Vorgänger, Nachfolger, Verzweigungen.
Darstellung als Kette oder Baum.

**Datenpfad:** `articles` mit `parent_id`, `lifespan_from`, `lifespan_to`.

**Module:** Silsila.

> Das ist der **einzige** Ansichtstyp, den die neuen Module wirklich neu
> brauchen — und das ist in Ordnung. Eine Silsila als Artikelliste zu zeigen
> würde ihren Sinn verfehlen.

### `media`

Audio- oder Videosammlung mit Abspieler und Download. Heute Teil der Dalāʾil
(die acht Rezitationen); später vielleicht eigenständig.

### `link`

Zeigt nach außen. Eine Kachel, die zu einer anderen Website führt. Braucht keine
Ansicht, nur eine URL.

---

## Wie ein Modul registriert wird

**Im Backend** — ein Datensatz. Kein Code.

**Im Frontend** — eine Zeile in der Registry:

```ts
// src/modules/registry.ts
import RecitationModule from './recitation'
import ArticleModule    from './article'
import WikiModule       from './wiki'
import TreeModule       from './tree'
import MediaModule      from './media'

export const VIEW_TYPES = {
  recitation: RecitationModule,
  article:    ArticleModule,
  wiki:       WikiModule,
  tree:       TreeModule,
  media:      MediaModule,
} as const

export type ViewType = keyof typeof VIEW_TYPES
```

Jedes Modul-Bündel erfüllt denselben Vertrag:

```ts
export interface ModuleDefinition {
  /** Übersichtsseite des Moduls */
  IndexView:  Component
  /** Liste innerhalb einer Sammlung */
  ListView:   Component
  /** Einzelnes Element */
  DetailView: Component
  /** Beiträge zur globalen Suche; null = nimmt nicht teil */
  search?: (query: string) => Promise<SearchHit[]>
  /** Zusätzliche Routen, falls der Typ welche braucht */
  routes?: RouteRecordRaw[]
}
```

Der Router löst zur Laufzeit auf:

```ts
{
  path: '/m/:module',
  component: () => {
    const mod = useModules().bySlug(route.params.module)
    return VIEW_TYPES[mod.view_type].IndexView
  }
}
```

---

## Was alle Module teilen — und teilen müssen

Das ist der Kern der Anforderung „alles einheitlich, und trotzdem erfüllt jeder
seine spezielle Aufgabe".

**Verbindlich für jedes Modul:**

| Bereich | Regel |
|---|---|
| Kopfleiste | `AppMasthead variant="compact"`. Keine eigene. |
| Seitengerüst | Gerüst A oder B aus `docs/design/03-layout.md`. Kein drittes. |
| Karten | `ContentCard`. Kein eigenes Kartenlayout. |
| Farben, Abstände | Ausschließlich Tokens aus `01-tokens.md` |
| Schriften | Die drei Stimmen aus `02-typography.md` |
| Suche | Beitrag zur globalen Suche, im selben Trefferformat |
| Leerzustand | `EmptyState` |
| Fehlerzustand | `ErrorState` |
| Ladezustand | `SkeletonCard` |
| Startseite | Eine Kachel, drei Zeilen, kein Icon |
| Sprache | Alle Beschriftungen über `vue-i18n`, keine festen Zeichenketten |

**Frei je Modul:**

- Wie die Detailansicht aussieht (ein Vers ist keine Biografie)
- Welche Bedienelemente die Kopfzeile trägt (Autoscroll gibt es nur beim Lesen)
- Wie sortiert und gefiltert wird
- Welche Metadaten angezeigt werden

Die Faustregel: **Chrome ist geteilt, Inhalt ist eigen.** Alles zwischen dem
Bildschirmrand und dem eigentlichen Inhalt gehört dem System, nicht dem Modul.

---

## Die Startseite

Sie rendert sich vollständig aus `modules`:

```sql
SELECT m.slug, m.view_type, m.sort_order, mt.title, mt.subtitle
FROM modules m
JOIN module_translations mt ON mt.module_id = m.id AND mt.lang = ?
WHERE m.is_published = 1
ORDER BY m.sort_order;
```

Reihenfolge, Sichtbarkeit und Beschriftung sind ohne Deploy änderbar. Ein neues
Modul erscheint, sobald `is_published = 1` gesetzt wird.

Die Mittelzelle des 3×3-Rasters ist **kein Modul**, sondern fest die
Kalligrafie. Sie ist der Anker des Layouts, nicht Inhalt.

---

## Ein neues Modul anlegen

### Fall A — vorhandenes Muster (der Normalfall)

Beispiel: „Ottoman" als Artikelsammlung.

```sql
INSERT INTO modules (slug, view_type, sort_order, is_published)
VALUES ('ottoman', 'article', 60, 0);

INSERT INTO module_translations (module_id, lang, title, description) VALUES
  (LAST_INSERT_ID(), 'de', 'Osmanisch', 'Geschichte und Überlieferung…'),
  (LAST_INSERT_ID(), 'en', 'Ottoman',   'History and transmission…');
```

Fertig. Kein Code, kein Deploy. Auf `is_published = 1` setzen, wenn Inhalt da ist.

Später aus der Admin-Oberfläche, nicht aus SQL.

### Fall B — neuer Ansichtstyp (selten)

Beispiel: „Silsila" als Stammbaum.

1. `src/modules/tree/` anlegen, den `ModuleDefinition`-Vertrag erfüllen
2. In `registry.ts` eintragen
3. `view_type` in `db/schema.sql` um `'tree'` erweitern (bereits vorhanden)
4. **`docs/design/07-adding-a-module.md` lesen und einhalten** — der neue Typ
   muss dieselben Karten, Leisten und Tokens benutzen
5. Modul anlegen wie in Fall A

**Wann Fall B gerechtfertigt ist:** wenn der Inhalt eine Struktur hat, die
keiner der vorhandenen Typen abbildet — nicht, wenn er nur anders aussehen soll.
Anders aussehen heißt eine Variante, keinen neuen Typ.

---

## Warum nicht mehr Konfiguration

Man könnte weiter gehen: die Ansichten selbst konfigurierbar machen, Felder in
der Datenbank definieren, ein Layout aus JSON zusammensetzen. Ein generisches
CMS eben.

Dagegen sprechen zwei Dinge.

**Erstens** würde die Konfigurationssprache mit jedem Sonderfall wachsen, bis
sie selbst eine Programmiersprache ist — nur ohne Typprüfung, ohne Debugger und
ohne dass jemand außer dem Autor sie versteht.

**Zweitens** sind die Sonderfälle dieser App zu speziell. Die Höhenanpassung der
Manuskriptblätter im 80. Perzentil unter Ausschluss absichtlich kurzer Seiten
lässt sich nicht konfigurieren. Sie ist Code, und sie gehört in eine Ansicht,
nicht in ein Formular.

Der Schnitt hier ist bewusst konservativ: **Daten bestimmen, was es gibt; Code
bestimmt, wie es aussieht.**
