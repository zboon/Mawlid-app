# Fahrplan

Wie wir von der heutigen `index.html` zur zentralen Vue-Anwendung kommen.

Acht Phasen. Jede endet mit etwas, das man **ansehen und benutzen** kann — nicht
mit „das Backend ist halb fertig". Nach jeder Phase kann sinnvoll gestoppt,
umentschieden oder pausiert werden.

Die Zeitangaben gehen von **einer Person, nebenbei** aus. Wer Vue schon kann,
ist deutlich schneller; wer es dabei lernt, langsamer — dann ist die Zeit aber
gut angelegt, weil Phase 1 bis 3 genau die Konzepte durchspielen, die man
braucht.

---

## Übersicht

| # | Phase | Ergebnis | Aufwand |
|---|---|---|---|
| 0 | Sofortmaßnahmen | Zwei Fehler in der alten App behoben | 1–2 h |
| 1 | Gerüst und Design-System | Die Startseite steht, mit echtem Design | 1–2 Wochen |
| 2 | Datenbank und Import | Alle 2.512 Verse liegen in MySQL, geprüft | 1–2 Wochen |
| 3 | API und Leser | Man kann lesen — Lese- und Buchansicht | 2–3 Wochen |
| 4 | Suche, Favoriten, Position | Funktionsgleichstand mit der alten App | 1–2 Wochen |
| 5 | Admin und Rollen | Inhalte im Browser pflegbar | 2–3 Wochen |
| 6 | Neue Module | Silsila, Sohbets, Ottoman, Wiki | 2–4 Wochen |
| 7 | Live-Sitzungen | Führen und Folgen wieder da | 1–2 Wochen |
| 8 | Offline (optional) | Die App funktioniert wieder ohne Netz | 1–2 Wochen |

---

## Phase 0 · Sofortmaßnahmen an der alten App

**Unabhängig vom Neuaufbau.** Diese Fehler existieren heute und lassen sich in
einer Stunde beheben. Sie jetzt zu beheben heißt auch: sie wandern nicht
unbemerkt mit.

- [ ] **B1 — Al-Aḥzāb erreichbar machen.** 950 Verse (38 % des Textbestands)
      sind über die Oberfläche nicht zu erreichen und tauchen in der Suche nicht
      auf. Eine Navigationszeile im Dalāʾil-Index und eine Zeile im Suchzweig.
- [ ] **B2 — Verwaisten CSS-Block reparieren.** `index.html:889` fehlt ein
      Selektor. Folge: `.v-note` ist völlig ungestylt und
      `.verse.v-instruction` greift überhaupt nicht.
- [ ] `sw.js` — Cache-Version erhöhen, sonst sehen installierte Telefone die
      Korrektur nicht.

Beides ist in `docs/analysis/befunde.md` mit fertigem Fix beschrieben.

> **Empfehlung: das zuerst machen.** Es ist der einzige Punkt im ganzen Plan,
> der heute schon Nutzern hilft.

---

## Phase 1 · Gerüst und Design-System

**Ziel:** Ein laufendes Vue-Projekt, dessen Startseite aussieht wie das Bild aus
der Skizze — noch ohne Datenbank, mit fest verdrahteten Beispieldaten.

### Was entsteht

```
apps/web/
  src/styles/tokens.css     ← docs/design/01-tokens.md, eins zu eins
  src/styles/base.css
  src/components/…          ← die Basiskomponenten aus 04-components.md
  src/views/HomeView.vue    ← das 3×3-Raster
  src/router/index.ts
  public/fonts/             ← die Schriften als echte Dateien
  public/img/               ← Kalligrafien
docker-compose.yml
```

### Aufgaben

- [x] `npm create vite@latest` — Vue + TypeScript
- [x] Vue Router, Pinia, vue-i18n einrichten
- [x] ESLint, Prettier, `vue-tsc` einrichten
- [x] **Die base64-Blöcke aus `index.html` herauslösen** — drei Schriftdateien
      (623 KB), drei Bilder (85 KB). Lizenzdateien mit
- [x] Crimson Pro und Karla selbst hosten statt von Google
- [x] `tokens.css` aus der Dokumentation schreiben, hell und dunkel
- [x] Theme-Umschalter mit `localStorage` und `prefers-color-scheme` als Startwert
- [x] `AppMasthead`, `IconButton`, `HomeTile`, `HomeMedallion`, `EmptyState`,
      `SkeletonCard`
- [x] Das 3×3-Startraster mit dem Medaillon in der Mitte
- [x] `docker-compose.yml` mit dem `web`-Dienst
- [x] **`tools/check-tokens.mjs`** — macht die Token-Regel prüfbar statt
      nur dokumentiert
- [x] `TabBar` und `ContentCard` — nachgeholt in Phase 3, als es Sammlungen und
      Werke gab

### Fertig, wenn

Die Startseite lässt sich neben der alten App öffnen und der Unterschied fällt
nur auf, weil das Raster jetzt 3×3 ist. Dunkelmodus stimmt. Arabische Schrift
sitzt richtig.

**Erreicht.** `npm run verify` läuft durch (Typen, Lint, Token-Prüfung), der
Build erzeugt 158 KB JS (58 KB gepackt) gegenüber 976 KB gepackt bei der alten
App, und die Startseite ist in beiden Themen und beiden Breakpoints geprüft.

### Warum diese Reihenfolge

Zuerst das Design, dann die Daten. Wer umgekehrt vorgeht, baut die Oberfläche
zweimal — einmal provisorisch und einmal richtig. Und das Design-System ist die
eigentliche Anforderung („einheitlich und trotzdem seine spezielle Aufgabe").

---

## Phase 2 · Datenbank und Import

**Ziel:** Alle Inhalte liegen in MySQL, nachweislich vollständig.

### Aufgaben

- [x] MySQL im Compose-Verbund, `utf8mb4` durchgängig
- [x] `db/schema.sql` gegen eine echte MySQL-8-Instanz geladen — 34 Tabellen,
      3 Ansichten. Dabei kam heraus, dass `separator` ein reserviertes Wort ist
- [x] `tools/build-seed.mjs` — Zuordnung nach `07-migration.md`
- [x] `tools/load-seed.mjs` — in einer Transaktion, idempotent
- [x] **`tools/verify-migration.mjs`** — die Gegenprüfung, 12 Prüfungen
- [x] Prüfbericht archiviert: `docs/analysis/migrationsbericht.txt`
- [x] `prisma/schema.prisma` aus `db/schema.sql` ableiten — nachgeholt in
      Phase 3, per `prisma db pull` aus der laufenden Datenbank

### Fertig, wenn

Der Prüfbericht meldet **null** Abweichungen: 2.512 Verse, jeder Verstext
bytegleich mit der Quelle, Folio-Bereiche lückenlos, Wochentagszuordnung
identisch, Mawlid-Reihenfolge identisch.

**Erreicht.** 8.900 Zeilen in MySQL, alle 12 Prüfungen bestanden. Aus den 111
Stücken wurden 109 Werke: `LITANY_CHAPTERS[2]` und `[3]` tragen nur Namen und
sind in Wahrheit die Überschriften ihrer Wochengruppen — sie wurden Sammlungen,
nicht Werke.

### Der wunde Punkt

Die Zeichentreue. Die Prüfung vergleicht **byteweise**, ohne Toleranz. Alles
andere wäre Selbstbetrug bei vokalisiertem Text.

---

## Phase 3 · API und Leser

**Ziel:** Man kann in der neuen App tatsächlich lesen.

### Aufgaben — Backend

- [x] Fastify aufsetzen, Prisma anbinden — `prisma/schema.prisma` wird mit
      `db:pull` aus der laufenden Datenbank **erzeugt**, nicht gepflegt
- [x] `GET /api/content/modules`
- [x] `GET /api/content/modules/:slug`
- [x] `GET /api/content/collections/:slug`
- [x] `GET /api/content/works/:slug` — Werk + Verse + Folios + Medien + Glossen
      in **einer** Antwort (Dienstag: 140 Verse, 104 KB)
- [x] `GET /api/content/schedule/:collection/today`
- [x] ETag, `If-None-Match` beantworten — mit einem Zusatz gegenüber dem
      Entwurf, siehe unten
- [x] Zod-Schemas, aus denen die Frontend-Typen entstehen
- [x] **`tools/verify-api.mjs`** — die Gegenprüfung, zehn Prüfungen

### Aufgaben — Frontend

- [x] TanStack Query anbinden
- [x] Modul- und Sammlungsansichten, `TabBar`, `ContentCard`
- [x] **Lese-Ansicht** — `VerseCard` mit allen Varianten, Umschrift/Übersetzung
      umschaltbar, Größenregler
- [x] **Buchansicht** — `ManuscriptBook`, `ManuscriptLeaf`, `ManuscriptBand`
- [x] **`useManuscriptFit`** — der Mess-und-Anpass-Algorithmus
- [x] `useAutoScroll` — neun Stufen, 0,14–0,70 px pro Bild
- [x] Vollbildmodus, Escape zum Verlassen
- [x] Leseleiste mit Hysterese (Schwellen 88 / 32)
- [x] YouTube-Einbettung und Audio-Dock
- [x] Skeleton- und Fehlerzustände (neu — es gibt jetzt Ladezeiten)

### Fertig, wenn

Ein Dalāʾil-Wochenteil lässt sich in beiden Ansichten lesen, die Blätter haben
einheitliche Höhe, der Text füllt den Goldrahmen, Autoscroll läuft, Audio spielt.

**Erreicht.** Im Browser gemessen (Chromium, 390 × 844):

| | |
|---|---|
| Dienstag, Lese-Ansicht | 140 Verskarten, Rosetten als Inline-SVG |
| Dienstag, Buchansicht | 14 Blätter, **alle 1698 px hoch**, Schriftgrößen 29,5–32,3 px |
| Freitag, dunkel | 16 Blätter, alle 1762 px |
| Autoscroll | 62 px in 2,5 s bei Stufe 5 (= 0,42 px/Bild bei 60 Bildern) |
| Schlank-Modus | klappt bei 200 px ein, bleibt bei 50 px eingeklappt, öffnet bei 10 px |
| Vollbild | Escape verlässt es, Leiste ist weg, Blatt füllt die Breite |
| Gegenprüfung | 10 von 10, 5 834 Verstexte bytegleich über HTTP |
| Bündel | 197 KB / 70 KB gepackt (Phase 1: 158/58; alte App: 976 KB gepackt) |

### Der wunde Punkt

`useManuscriptFit`. Der Algorithmus misst echtes DOM, hängt am Zeitpunkt des
Schriftladens und läuft bei jeder Größenänderung neu. Er ist der Unterschied
zwischen „sieht aus wie ein Manuskript" und „sieht aus wie Text in einem
Kasten".

**Er sitzt.** Alle Blätter eines Kapitels haben dieselbe Höhe auf das Pixel,
die Schriftgröße variiert je Blatt um bis zu 10 %, damit der Text den
Goldrahmen füllt.

Zwei Dinge kosteten dabei Zeit, die im Entwurf nicht standen:

1. **Die Seitengrenzen kommen nicht aus den Folio-Angaben.** Aus 46 Einträgen
   werden 272 Blätter, weil das Zeichen `‖` im Verstext den Umbruch trägt. Das
   ist jetzt ein Test (`src/lib/pages.test.ts`) und keine Bemerkung mehr —
   wer es übersieht, bekommt 46 sehr volle Seiten und keine Fehlermeldung.
2. **`html.immersive .head` traf auch `.band.head`.** Im Vollbild verschwand
   damit die Illumination des ersten Blattes, lautlos. Globale Regeln nennen
   seither nur Namen, die es genau einmal gibt (`.reader-head`, `.ms-hint`).

### Die Treue-Runde (Nachtrag)

Der erste Wurf der Phase hatte die richtige Datenschicht und die falschen
Ansichtsstrukturen — „Darstellung zerschossen", völlig zu Recht. Der Abgleich
lief danach Ansicht für Ansicht gegen die alte App im selben Browserfenster,
mit ausgemessenen Stilwerten statt Augenmaß. Ergebnis:

- **Der Dalāʾil-Index ist der der Vorlage:** Heute-Karte, „Vor der Lesung",
  das 4-Spalten-Tagesraster mit „Mo ²", Goldlinie, „Zum Abschluss",
  „Über Dalāʾil al-Khayrāt", die Aḥzāb-Karte darunter. Vorher: eine flache
  Liste aus fünfzehn Karten.
- **Die Tabs sind die BEREICHE** (Mawlid · Nasheeds & Qasidas · Dalāʾil ·
  Al-Aḥzāb) und stehen auf jeder Index-Seite — nicht die Sammlungen eines
  Bereichs. Sammlungen wählt man auf der Bereichsseite als Kacheln
  („SAMMLUNG WÄHLEN"), wie in der Vorlage.
- **Montag, Teil 2 steht jetzt im Wochenplan** (weekday 1, slot_index 1) —
  wofür `schedule_slots.slot_index` gebaut war. Die Heute-Karte zeigt weiter
  auf Teil 1 (Platz 0), die Migrationprüfung prüft beides (jetzt 13 Prüfungen).
- **Leser:** „‹ Zurück" als Textknopf, Hinweis als grüne
  „Über diesen Abschnitt · نُبْذَة"-Klappe (Schwelle 160 Zeichen wie in der
  Vorlage), Hörknöpfe in voller Breite mit Goldrand, Buchfassung als
  Voreinstellung, Blattzahl mit Goldstrichen („— ١ —").
- **Karten in Karla, nicht in Crimson Pro** — die Zeile unter dem arabischen
  Titel ist Bedienoberfläche, keine Textseite. Nachgemessen, nicht vermutet.
- Zwei Fehler aus dem Umbau stehen als Tests fest
  (`src/lib/scheduleIndex.test.ts`): die achte Blase hieß „So ²", und das
  Abschlussgebet rutschte als neunte ins Raster.

Die zweite Runde des Abgleichs (am Rechner aufgefallen):

- **Die schwebenden Blätterpfeile** (`.ms-float`): fest in Bildschirmmitte,
  unter 560 px ausgeblendet. Ohne sie war die Buchansicht am Rechner nicht
  blätterbar — Wischen gibt es dort nicht, und die untere Leiste liegt unter
  einem blatthohen Bild.
- **Das letzte Blatt fließt in den nächsten Abschnitt** (msStep → nextPiece
  der Vorlage): der Weiter-Pfeil bleibt am Ende aktiv und öffnet das nächste
  Werk. Die Fußzeilen-Links Vorher/Weiter sind dafür entfallen — die Vorlage
  hat sie nicht.
- **Die Doppelseite ist eine WAHL** („Zwei Seiten"-Chip, gespeichert), keine
  Automatik ab 900 px. Die Automatik halbierte auf einem Laptop ungefragt die
  Blattbreite. Angeboten wird sie wie in der Vorlage ab
  `(min-width: 900px) and (min-height: 600px) and (orientation: landscape)`.
- **Leere Kapitel sind veröffentlicht** — damit ist Frage 1/7 aus
  `07-migration.md` im Sinne der Vorlage entschieden: Barzanjī zeigt
  „17 Werke", ein leeres Kapitel öffnet eine Platzhalterseite, Nasheeds und
  Qawwalis stehen als „Demnächst"-Kacheln da. Rückweg: `status='draft'`
  setzen, die API blendet Entwürfe von selbst aus.
- Das Teilerband erscheint nur noch in der Buchansicht (die Lesefassung der
  Vorlage zeigt es nicht), der Leserkopf trägt die laufende Nummer
  („12 · …"), die Blattzahl ihre Goldstriche.
- **52 Interaktionsprüfungen** über die ganze App (jede Seite, jeder Knopf,
  schmal und breit) laufen grün.

**Absichtlich noch anders als die Vorlage** (mit Grund, nicht aus Versehen):
Suchfeld (Phase 4), Favoriten-Tab (Phase 4), „Save my place" und
Wiederaufnahme-Karte (Phase 4), Downloads-Zeile (Phase 4),
„Works offline"-Fußzeile (Phase 7).

### Was der Entwurf nicht vorsah

- **Der ETag trägt zusätzlich einen Abdruck des Rumpfes.** `content_version`
  hängt an der Sammlung und rührt sich nicht, wenn eine Modulüberschrift
  umbenannt wird. Begründung in `04-backend-api.md`.
- **Zod läuft nur auf dem Server.** Die Oberfläche importiert aus
  `packages/shared` nur `import type`. Eine zweite Prüfung von 2 512 Versen im
  Browser wäre Rechenzeit ohne Erkenntnis; die Schemas erzeugen trotzdem die
  Frontend-Typen, wie verlangt.
- **Die API läuft über `tsx`, ohne Übersetzungsschritt.** Begründung im
  Dockerfile: `packages/shared` ist als Quelle eingebunden, ein Pfad-Alias
  überlebt `tsc` nicht, und dieser Server bedient einen Haushalt.
- **Ein Wert steht noch im Frontend, der in die Datenbank gehört.** Die
  Buchansicht behält Kommata nur in den Dalāʾil und den Aḥzāb (in der alten App
  die Kürzel `d` und `l`). Das steht als benannte Konstante in
  `src/lib/pages.ts` und gehört als Spalte an `modules`, sobald die
  Redaktionsoberfläche sie setzen kann — Phase 6.

---

## Phase 4 · Suche, Favoriten, Leseposition

**Ziel:** Funktionsgleichstand mit der alten App. Ab hier ist der Umstieg
zumutbar.

### Aufgaben

- [x] `tools/lib/normalize.mjs` — die Normalisierung **Zeichen für Zeichen**
      übernommen, gegen die Vorlage auf allen 5.834 Verstexten geprüft:
      null Abweichungen. Wandert in Phase 4 nach `packages/shared/`
- [x] **Eine Faltung für alle Sprachen**, wie in der Vorlage. Die
      sprachabhängige Variante wurde gebaut und wieder verworfen: sie kostet
      Treffer, statt welche zu retten — siehe `05-database.md` §6
- [ ] Beim Speichern `body_search` füllen
- [ ] `GET /api/content/search?q=…` — Vierfach-ODER, Treffer mit
      Vers und Segment, sechs je Werk
- [ ] Trefferliste unter den Karten, Sprung zum Vers mit Aufblitzen
- [ ] Favoriten: `/api/me/favorites` plus lokale Spiegelung
- [ ] Lesepositionen: `/api/me/positions` — **je Werk eine**, nicht mehr nur für
      die Dalāʾil
- [ ] Markierungen: `/api/me/marks`
- [ ] Geräte-ID für Nutzung ohne Anmeldung
- [ ] Anzeigeeinstellungen speichern (heute gehen sie beim Neuladen verloren)
- [ ] Der Suchgleichheitstest aus Phase 2 muss grün bleiben

### Fertig, wenn

Vierzig Suchbegriffe — arabisch, in Umschrift, englisch, mit Tippfehlern —
liefern in beiden Apps dieselben Werke.

---

## Phase 5 · Admin und Rollen

**Ziel:** Inhalte im Browser pflegen, mit mehreren Personen.

### Aufgaben

- [ ] Anmeldung: Session-Cookie, `argon2id`, Sperre nach zu vielen Versuchen
- [ ] Rollen `reader` / `contributor` / `editor` / `admin`
- [ ] Rechteprüfung als Fastify-Plugin, **einmal**, nicht je Endpunkt
- [ ] Admin-Oberfläche:
  - [ ] Module und Sammlungen: anlegen, sortieren, veröffentlichen
  - [ ] Werke: Metadaten, Medien, Folios
  - [ ] **Verseditor** — der wichtigste Teil. Arabisch, Umschrift, Übersetzung
        nebeneinander; Vorschau in der echten Schrift; ein Knopf für `۞`
  - [ ] Zeitpläne: Wochentag → Werk zuordnen
  - [ ] Lesereihenfolgen: per Ziehen ordnen
  - [ ] Benutzerverwaltung
- [ ] `content_revisions` bei jeder Änderung schreiben
- [ ] Entwurf/Veröffentlicht getrennt
- [ ] `audit_log`
- [ ] Korrekturformular für Leser (ersetzt den mailto:-Link)

### Fertig, wenn

Eine zweite Person kann sich anmelden, eine Übersetzung ändern, als Entwurf
speichern — und ohne `editor`-Rolle nicht veröffentlichen.

### Der wunde Punkt

Der Verseditor. Ein normales Textfeld reicht für vokalisiertes Arabisch nicht:
Man braucht die richtige Schrift in der Eingabe, eine Live-Vorschau und
Schutz davor, dass ein Copy-Paste aus Word die Harakāt zerstört.

---

## Phase 6 · Die neuen Module

**Ziel:** Silsila, Sohbets, Ottoman und Wiki — die Bereiche aus der Skizze.

Ab hier zahlt sich die Modularchitektur aus: drei der vier brauchen **keinen
neuen Ansichtstyp**.

### Aufgaben

- [ ] Ansichtstyp `article` — Fließtext aus Markdown, Inhaltsverzeichnis, Bilder
- [ ] **Sohbets** — Vorträge mit Datum, Sprecher, optionalem Audio.
      Ansichtstyp `article` + `media`
- [ ] **Ottoman** — historische Beiträge. Ansichtstyp `article`
- [ ] Ansichtstyp `wiki` — Querverweise, Rückverweise („was zeigt hierher?"),
      Volltextsuche über Artikel
- [ ] **Wiki** — mit Verknüpfung zu den Rezitationstexten (`article_works`):
      ein Artikel über Imam al-Būṣīrī zeigt auf die Burdah und umgekehrt
- [ ] Ansichtstyp `tree` — **der einzige wirklich neue**
- [ ] **Silsila** — Kette mit Lebensdaten, Vor-/Nachfolger, Verzweigungen

### Fertig, wenn

Ein neues Modul anzulegen dauert Minuten, nicht Tage — solange es ein
vorhandenes Muster benutzt.

---

## Phase 7 · Live-Sitzungen

**Ziel:** Was heute über Supabase läuft, läuft über den eigenen Server.

### Aufgaben

- [ ] WebSocket-Endpunkt in Fastify (`@fastify/websocket`)
- [ ] Sitzung starten → vierstelliger Code, in `live_sessions`
- [ ] Beitreten per Code **und** per Link `#s=1234`
- [ ] Führender sendet „Werk + Vers + Ansicht", Folgende springen mit
- [ ] Übernahme und „Zurück in den Takt"
- [ ] Banner: führend / folgend / pausiert
- [ ] Spätes Beitreten springt an die aktuelle Stelle
- [ ] Aufräumen abgelaufener Sitzungen
- [ ] Supabase-Zugangsdaten aus dem Quelltext entfernen

### Fertig, wenn

Zwei Geräte im selben Netz folgen einander wie heute.

---

## Phase 8 · Offline (optional)

**Ziel:** Die App funktioniert wieder ohne Netz.

Diese Phase steht am Ende, weil online-first entschieden wurde (ADR-004). Sie
steht überhaupt hier, weil die alte App das kann und in einer Moschee ohne WLAN
das der ganze Punkt ist.

Sie ist **ein abgegrenztes Arbeitspaket, kein Neuentwurf** — vorausgesetzt, die
Vorkehrungen aus ADR-004 wurden eingehalten.

### Aufgaben

- [ ] `GET /api/content/collections/:slug/full` — die ganze Sammlung als **ein**
      Dokument
- [ ] `vite-plugin-pwa` mit Workbox
- [ ] Beim ersten Laden: Inhalt nach IndexedDB
- [ ] Beim Start: `content_version` prüfen, nur bei Änderung nachladen
- [ ] Ohne Netz: aus IndexedDB lesen
- [ ] Sichtbare Anzeige „offline, Stand vom …"
- [ ] Schriften im Service Worker vorhalten
- [ ] Herunterladbare Rezitationen (Cache Storage, **ohne Versionsnummer** —
      sonst löscht das nächste Update 150 MB, siehe Befund)

---

## Wenn du gleich anfangen willst

**Reihenfolge für den ersten Tag:**

1. Phase 0 abarbeiten — zwei Fehler weniger, sofort
2. Node 22 und Docker Desktop installieren
3. `node tools/extract-content.mjs` laufen lassen und in
   `data/extracted/_manifest.json` schauen — das ist deine Datenlage
4. `docs/design/01-tokens.md` und `docs/design/03-layout.md` lesen
5. Phase 1 beginnen

**Was ich als Nächstes für dich bauen kann** (sag Bescheid, was zuerst):

- Das Vue-Gerüst mit `tokens.css`, den Basiskomponenten und dem 3×3-Startraster
  — also Phase 1 komplett
- `tools/build-seed.mjs` und `tools/verify-migration.mjs` — also Phase 2
- Die Fixes aus Phase 0 direkt in `index.html`

---

## Was schiefgehen kann

| Risiko | Warum es weh tut | Gegenmittel |
|---|---|---|
| **Zeichenverlust beim Import** | Handvokalisiertes Arabisch ist unersetzlich | Byteweise Gegenprüfung, ohne Toleranz. Phase 2 gilt erst als fertig, wenn null Abweichungen |
| **Die Manuskriptansicht sieht falsch aus** | Sie ist die Signatur der App | `useManuscriptFit` früh und ernsthaft bauen, nicht als Feinschliff |
| **Die Suche verhält sich anders** | Menschen suchen Verse, die sie halb im Ohr haben | Normalisierung Zeichen für Zeichen übernehmen, mit 40 festen Testbegriffen absichern |
| **Offline fehlt und fällt erst in der Moschee auf** | Genau dort wird die App gebraucht | Bewusst entschieden (ADR-004). Alte App als Notfallkopie behalten, bis Phase 8 steht |
| **Halbfertige Inhalte wandern unsichtbar mit** | 16 leere Barzanjī-Kapitel sehen in einer Datenbank aus wie echte Daten | Vor Phase 2 entscheiden (`07-migration.md` §7) |
| **Das Design zerfällt beim dritten Modul** | Genau das soll die Dokumentation verhindern | Regeln aus `docs/design/` einhalten; ein Linter, der literale Farben verbietet |
| **Phase 5 wird zum Fass ohne Boden** | Admin-Oberflächen wachsen unbegrenzt | Erst der Verseditor, alles andere danach. Was nicht wöchentlich gebraucht wird, bleibt SQL |
