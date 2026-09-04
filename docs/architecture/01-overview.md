# Architektur — Überblick

Wie die Teile zusammenhängen und warum sie so geschnitten sind.

---

## Das Bild

```
┌──────────────────────────────────────────────────────────┐
│  Browser                                                 │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Vue 3 SPA  (Vite)                                 │  │
│  │  ├─ Router      Modul → Sammlung → Werk → Vers     │  │
│  │  ├─ Pinia       Theme, Anzeige, Sitzung, Auth      │  │
│  │  ├─ Query       API-Daten mit Cache                │  │
│  │  └─ Module      recitation · article · wiki · tree │  │
│  └────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────┘
                            │  HTTPS  ·  JSON  ·  ETag
┌───────────────────────────▼──────────────────────────────┐
│  API   (Fastify + TypeScript)                            │
│  ├─ /api/content/*     öffentlich, lesend, gecacht       │
│  ├─ /api/me/*          persönliche Daten (Login nötig)   │
│  ├─ /api/admin/*       Redaktion (Rolle nötig)           │
│  └─ /ws                Live-Sitzungen (WebSocket)        │
│                                                          │
│  Prisma  ─────────────────────────────────────┐          │
└───────────────────────────────────────────────┼──────────┘
                                                │
┌───────────────────────────────────────────────▼──────────┐
│  MySQL 8.4                                               │
│  modules · collections · works · verses · verse_texts    │
│  folios · sequences · schedules · media · articles       │
│  users · favorites · reading_positions · revisions       │
└──────────────────────────────────────────────────────────┘
```

Alles läuft lokal über Docker Compose. Drei Container: `mysql`, `api`, `web`.

---

## Die vier Schichten und was in welche gehört

### 1 · Datenbank

Hält den **Inhalt** und die **Struktur**. Sie weiß nicht, wie etwas aussieht.

Der entscheidende Unterschied zu heute: Reihenfolge, Gruppierung und
Wochentagszuordnung sind Spalten, keine Array-Positionen. Was heute
`DALAIL_TODAY_IDX = { 1:6, 2:7, … }` ist — eine Abbildung von Wochentag auf
Array-Index — ist morgen die Tabelle `schedule_slots`.

### 2 · API

Übersetzt Datenbankzeilen in das Format, das die Oberfläche braucht, und setzt
die Rechte durch. Sie **rendert kein HTML** und entscheidet nichts über
Darstellung.

Drei Zonen mit klar getrennten Regeln:

| Zone | Auth | Cache | Inhalt |
|---|---|---|---|
| `/api/content/*` | keine | aggressiv, ETag | Alles Veröffentlichte |
| `/api/me/*` | Login oder Geräte-ID | nie | Favoriten, Lesepositionen, Markierungen |
| `/api/admin/*` | Rolle | nie | Redaktion |

### 3 · Frontend

Vue 3. Kennt die Datenbank nicht, nur die API-Typen. Enthält die gesamte
Darstellungslogik, das Design-System und die Ansichtstypen.

### 4 · Echtzeit

Ein WebSocket-Endpunkt für Live-Sitzungen. Vom Rest bewusst getrennt: fällt er
aus, funktioniert die App weiter, genau wie heute.

---

## Das Modulkonzept

Der Kern der Antwort auf „mehrere Anwendungen in einer".

**Ein Modul** ist ein Bereich der App. Es ist eine Zeile in `modules` plus
Übersetzungen. Es hat einen **Ansichtstyp**, der bestimmt, welche Vue-Ansicht
seine Inhalte darstellt:

| Ansichtstyp | Was er darstellt | Beispielmodule |
|---|---|---|
| `recitation` | Werke mit nummerierten Versen, Lese- und Buchansicht | Dalāʾil, Mawlid, Burdah, Ilahis |
| `article` | Fließtextbeiträge, chronologisch oder thematisch | Sohbets, Ottoman |
| `wiki` | Verlinkte Artikel mit Suche und Querverweisen | Wiki |
| `tree` | Hierarchie mit Personen und Lebensdaten | Silsila |
| `media` | Audio- und Videosammlung | (später) |
| `link` | Verweist nach außen | (später) |

**Warum das der richtige Schnitt ist:** Ein neues Modul, das ein vorhandenes
Muster benutzt, ist ein Datensatz — kein Code. „Ottoman" als Artikelsammlung
anzulegen heißt: eine Zeile in `modules`, ein paar in `articles`. Die
Startseite zeigt es, die Suche findet es, das Design stimmt automatisch.

**Wo die Grenze liegt:** Silsila als Stammbaum braucht wirklich eine eigene
Ansicht. Das ist in Ordnung — die Alternative wäre ein Konfigurationsformat,
das irgendwann selbst eine Programmiersprache wird. Ein neuer Ansichtstyp ist
ein bewusster, seltener Schritt; ein neues Modul ist Alltag.

---

## Die Route-Struktur

URLs bilden die Hierarchie ab. Das ist mehr als Kosmetik: die heutige App hat
**keinen Router** — der Zurück-Knopf des Browsers verlässt die App, und keine
Ansicht ist teilbar.

```
/                                     Startseite, 3x3-Raster
/m/:module                            Modulübersicht
/m/:module/:collection                Werkliste
/m/:module/:collection/:work          Leser
/m/:module/:collection/:work#v:42     Leser, auf Vers 42
/wiki/:slug                           Wiki-Artikel
/search?q=…                           Suche über alles
/admin/…                              Redaktion
/session/:code                        Live-Sitzung beitreten
```

Alles ist adressierbar und teilbar. Der Zurück-Knopf tut, was er soll.

---

## Datenfluss beim Öffnen eines Textes

```
Benutzer tippt auf eine Karte
  → Router wechselt zu /m/dalail/wochenteile/dienstag
  → useWork('dienstag') fragt TanStack Query
      → Treffer im Cache?  → sofort rendern
      → sonst  GET /api/content/works/dienstag?lang=de
          → API prüft ETag → 304 oder JSON
  → Werk + Verse + Folios + Medien liegen als ein Objekt vor
  → RecitationView entscheidet: Lese- oder Buchansicht
  → bei Buchansicht: useManuscriptFit() misst und passt an
```

**Ein Aufruf pro Werk, nicht einer pro Vers.** Der teuerste Text hat 213 Verse;
das sind rund 90 KB JSON. Ein Wasserfall aus Einzelabfragen wäre hier deutlich
schlechter als eine große Antwort.

---

## Was aus welchem Teil der alten App wird

| Heute | Morgen |
|---|---|
| `const QASIDAS = [...]` und acht weitere Arrays | Tabellen `works` + `verses` + `verse_texts` |
| `state.tab` (18 Werte) | Vue Router mit benannten Routen |
| `renderIndex()`, `readerHTML()`, `innerHTML` | Vue-Komponenten |
| ~60 globale Funktionen auf `window` | Composables und Komponentenmethoden |
| `onclick="openDalail(6)"` in HTML-Strings | `@click` mit typisierten Handlern |
| Kürzel `q b s i d z y n l` + `OPENERS` | Modul-Slug + Werk-Slug |
| Array-Index als Identität | `id` und `slug` in der Datenbank |
| `localStorage['mawlid-favs']` | `/api/me/favorites`, lokal gespiegelt |
| `DALAIL_TODAY_IDX` | Tabelle `schedule_slots` |
| Titelpräfix `"13 · …"` | Tabelle `sequence_items` |
| Supabase Realtime | eigener WebSocket-Endpunkt |
| Service Worker + alles im HTML | Online-first (ADR-004) |
| base64-Schriften und -Bilder im HTML | Dateien unter `public/` |

---

## Verzeichnisstruktur

```
Mawlid-app/
├── index.html, sw.js, manifest.json      ← die alte App, bleibt bis zur Ablösung
│
├── apps/
│   ├── web/                              Vue 3 + Vite
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── router/
│   │   │   ├── stores/                   Pinia
│   │   │   ├── api/                       generierte Client-Typen
│   │   │   ├── styles/
│   │   │   │   ├── tokens.css            ← Umsetzung von docs/design/01-tokens.md
│   │   │   │   ├── base.css
│   │   │   │   └── themes.css
│   │   │   ├── components/               der Baukasten
│   │   │   ├── modules/                  je Ansichtstyp ein Verzeichnis
│   │   │   │   ├── recitation/
│   │   │   │   ├── article/
│   │   │   │   ├── wiki/
│   │   │   │   └── tree/
│   │   │   ├── composables/
│   │   │   │   ├── useManuscriptFit.ts
│   │   │   │   ├── useAutoScroll.ts
│   │   │   │   ├── useReadingPosition.ts
│   │   │   │   └── useLiveSession.ts
│   │   │   ├── i18n/                     de.json, en.json, ar.json, tr.json
│   │   │   └── views/
│   │   └── public/
│   │       ├── fonts/                    + LICENSES/
│   │       └── img/
│   │
│   └── api/                              Fastify + TypeScript
│       ├── src/
│       │   ├── server.ts
│       │   ├── routes/
│       │   │   ├── content/
│       │   │   ├── me/
│       │   │   └── admin/
│       │   ├── ws/
│       │   ├── services/
│       │   └── lib/
│       │       └── normalize.ts          ← geteilt mit dem Frontend
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
├── packages/
│   └── shared/                           Typen + Normalisierung für beide Seiten
│
├── db/
│   ├── schema.sql                        lesbare Referenz
│   └── seed/                             generierte Importdateien
│
├── tools/
│   ├── extract-content.mjs               ✅ fertig — zieht Daten aus index.html
│   └── build-seed.mjs                    baut daraus die Importdateien
│
├── data/extracted/                       ✅ Ergebnis der Extraktion
├── docs/                                 dieses Verzeichnis
└── docker-compose.yml
```

---

## Grundsätze

**1 · Die Datenbank kennt kein Aussehen.** Keine Spalte heißt `color` oder
`css_class`. `view_type` sagt, *welche Art* von Inhalt es ist, nicht wie er
gezeichnet wird.

**2 · Die API kennt kein Vue.** Sie liefert Daten. Wenn eine Antwort nur für
eine bestimmte Komponente Sinn ergibt, ist der Schnitt falsch.

**3 · Ein Ort für jede Regel.** Farben in `tokens.css`. Zugriffsrechte in einer
Fastify-Plugin-Ebene. Textnormalisierung in `packages/shared`. Wenn dieselbe
Regel an zwei Stellen steht, laufen sie auseinander.

**4 · Die alte App bleibt lauffähig, bis die neue trägt.** Es gibt keinen Tag,
an dem etwas kaputt und noch nichts fertig ist.

**5 · Inhalt ist heiliger als Code.** 2.512 handvokalisierte arabische Verse
sind das eigentliche Kapital dieses Projekts. Jede Migration wird geprüft, jede
Änderung versioniert, jeder Zeichenverlust ist ein Fehler höchster Priorität.
