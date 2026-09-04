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

- [ ] `npm create vite@latest` — Vue + TypeScript
- [ ] Vue Router, Pinia, vue-i18n einrichten
- [ ] ESLint, Prettier, `vue-tsc` einrichten
- [ ] **Die base64-Blöcke aus `index.html` herauslösen** — drei Schriftdateien
      (~830 KB), drei Bilder (~115 KB). Lizenzdateien mit
- [ ] `tokens.css` aus der Dokumentation schreiben, hell und dunkel
- [ ] Theme-Umschalter mit `localStorage` und `prefers-color-scheme` als Startwert
- [ ] `AppMasthead`, `IconButton`, `TabBar`, `ContentCard`, `HomeTile`
- [ ] Das 3×3-Startraster mit dem Medaillon in der Mitte
- [ ] `docker-compose.yml` mit dem `web`-Dienst

### Fertig, wenn

Die Startseite lässt sich neben der alten App öffnen und der Unterschied fällt
nur auf, weil das Raster jetzt 3×3 ist. Dunkelmodus stimmt. Arabische Schrift
sitzt richtig.

### Warum diese Reihenfolge

Zuerst das Design, dann die Daten. Wer umgekehrt vorgeht, baut die Oberfläche
zweimal — einmal provisorisch und einmal richtig. Und das Design-System ist die
eigentliche Anforderung („einheitlich und trotzdem seine spezielle Aufgabe").

---

## Phase 2 · Datenbank und Import

**Ziel:** Alle Inhalte liegen in MySQL, nachweislich vollständig.

### Aufgaben

- [ ] MySQL 8.4 im Compose-Verbund, `utf8mb4` durchgängig
- [ ] `prisma/schema.prisma` aus `db/schema.sql` ableiten
- [ ] Erste Migration
- [ ] `tools/build-seed.mjs` — Zuordnung nach `07-migration.md`
- [ ] `npm run db:seed`
- [ ] **`tools/verify-migration.mjs`** — die Gegenprüfung
- [ ] Prüfbericht archivieren

### Fertig, wenn

Der Prüfbericht meldet **null** Abweichungen: 111 Werke, 2.512 Verse, jeder
Verstext bytegleich mit der Quelle, Folio-Bereiche lückenlos,
Wochentagszuordnung identisch, Mawlid-Reihenfolge identisch.

### Der wunde Punkt

Die Zeichentreue. Die Prüfung vergleicht **byteweise**, ohne Toleranz. Alles
andere wäre Selbstbetrug bei vokalisiertem Text.

---

## Phase 3 · API und Leser

**Ziel:** Man kann in der neuen App tatsächlich lesen.

### Aufgaben — Backend

- [ ] Fastify aufsetzen, Prisma anbinden
- [ ] `GET /api/content/modules`
- [ ] `GET /api/content/modules/:slug`
- [ ] `GET /api/content/collections/:slug`
- [ ] `GET /api/content/works/:slug` — Werk + Verse + Folios + Medien in **einer**
      Antwort
- [ ] `GET /api/content/schedule/:collection/today`
- [ ] ETag aus `content_version`, `If-None-Match` beantworten
- [ ] Zod-Schemas, aus denen die Frontend-Typen entstehen

### Aufgaben — Frontend

- [ ] TanStack Query anbinden
- [ ] Modul- und Sammlungsansichten
- [ ] **Lese-Ansicht** — `VerseCard` mit allen Varianten, Umschrift/Übersetzung
      umschaltbar, Größenregler
- [ ] **Buchansicht** — `ManuscriptBook`, `ManuscriptLeaf`, `ManuscriptBand`
- [ ] **`useManuscriptFit`** — der Mess-und-Anpass-Algorithmus
- [ ] `useAutoScroll` — neun Stufen, 0,14–0,70 px pro Bild
- [ ] Vollbildmodus, Escape zum Verlassen
- [ ] Leseleiste mit Hysterese (Schwellen 88 / 32)
- [ ] YouTube-Einbettung und Audio-Dock
- [ ] Skeleton- und Fehlerzustände (neu — es gibt jetzt Ladezeiten)

### Fertig, wenn

Ein Dalāʾil-Wochenteil lässt sich in beiden Ansichten lesen, die Blätter haben
einheitliche Höhe, der Text füllt den Goldrahmen, Autoscroll läuft, Audio spielt.

### Der wunde Punkt

`useManuscriptFit`. Der Algorithmus misst echtes DOM, hängt am Zeitpunkt des
Schriftladens und läuft bei jeder Größenänderung neu. Er ist der Unterschied
zwischen „sieht aus wie ein Manuskript" und „sieht aus wie Text in einem
Kasten". Dafür Zeit einplanen.

---

## Phase 4 · Suche, Favoriten, Leseposition

**Ziel:** Funktionsgleichstand mit der alten App. Ab hier ist der Umstieg
zumutbar.

### Aufgaben

- [ ] `packages/shared/normalize.ts` — die Normalisierung **Zeichen für Zeichen**
      übernommen
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
