# Technologie-Stack — was du brauchst und warum

Diese Seite ist die Einkaufsliste. Sie sagt, welches Werkzeug wofür da ist, was
du davon lernen musst und was du getrost ignorieren kannst. Am Ende steht, wie
du das Ganze auf einem leeren Rechner zum Laufen bringst.

---

## Auf einen Blick

| Schicht | Werkzeug | Wofür |
|---|---|---|
| Sprache | **TypeScript 5** | Überall — Frontend wie Backend |
| Frontend | **Vue 3** (Composition API, `<script setup>`) | Oberfläche |
| Build | **Vite 6** | Dev-Server, Bundling, HMR |
| Routing | **Vue Router 4** | Seiten und Module |
| State | **Pinia** | Geteilter Zustand (Theme, Einstellungen, Sitzung) |
| Server-State | **TanStack Query (Vue)** | API-Daten, Caching, Nachladen |
| Styling | **Reines CSS + Custom Properties** | Kein Framework — Begründung unten |
| i18n | **vue-i18n 10** | Oberflächentexte DE/EN/AR/TR |
| Backend | **Fastify 5** | HTTP-API |
| ORM | **Prisma 6** | MySQL-Zugriff, Migrationen, Typen |
| Validierung | **Zod 4** | Ein Schema für API-Eingaben *und* TS-Typen |
| Auth | **Fastify-Session + argon2** | Login, Rollen |
| Datenbank | **MySQL 8.4** | Inhalte |
| Betrieb | **Docker Compose** | Lokaler Start von allem |
| Tests | **Vitest** + **Playwright** | Unit/Component bzw. End-to-End |
| Qualität | **ESLint 9**, **Prettier**, **vue-tsc** | Linting, Formatierung, Typprüfung |

---

## Frontend im Detail

### Vue 3 mit Composition API

Zu lernen sind im Wesentlichen fünf Dinge, und mehr braucht dieses Projekt nicht:

1. **`ref` / `computed`** — reaktive Werte. `state.showTr` aus der alten App wird
   zu `const showTr = ref(true)`, und jede Stelle, die ihn anzeigt, aktualisiert
   sich von selbst. Genau die manuellen `updateFavUI()`-, `updateScrollUI()`- und
   `renderIndex()`-Aufrufe der alten App fallen dadurch weg.
2. **Komponenten mit `<script setup>`** — eine `.vue`-Datei ist Vorlage, Logik und
   Stil eines Bausteins an einem Ort.
3. **Props und Emits** — wie Bausteine Daten hinein- und Ereignisse hinausgeben.
4. **`v-for` / `v-if` / `v-model`** — Listen, Bedingungen, Formularfelder.
5. **Composables** — wiederverwendbare Logik als Funktion (`useAutoScroll()`,
   `useReadingPosition()`). Das ist der Ersatz für die heutigen globalen
   Funktionen auf `window`.

> **Nicht nötig:** Options API, Vuex, Nuxt, SSR. Diese App ist eine reine
> Client-Anwendung hinter einem Login-freien Lesebereich; Server-Rendering würde
> nur Komplexität kosten.

### Warum kein Tailwind / kein UI-Framework

Das ist eine bewusste Entscheidung und keine Bequemlichkeit.

Das vorhandene Design ist nicht generisch. Es lebt von einer sehr spezifischen
Palette (Moscheegrün, Papierton, Gold), von arabischer Typografie mit
Vokalisierung, von Ornamenten wie der Rosette ۞ und dem Sternenband am
Kopfseitenrand, und von einer Manuskript-Ansicht, die eine Buchseite nachbildet.
Ein Utility-Framework würde diese Regeln über tausende Klassennamen im Markup
verstreuen, statt sie an einem Ort festzuhalten — und genau das Festhalten ist
die Anforderung („damit spätere Anpassungen an dem Design passen").

Stattdessen:

- **Design-Tokens als CSS Custom Properties** in einer Datei
  (`src/styles/tokens.css`), exakt so wie heute schon in `:root` / `:root.dark`.
- **Komponenten-Styles** als `<style scoped>` in der jeweiligen `.vue`-Datei.
- **Ein kleiner Satz Basisklassen** für Karten, Chips, Leisten — dokumentiert in
  `docs/design/04-components.md`.

Wenn Utility-Klassen später gewünscht sind, lässt sich UnoCSS mit genau diesen
Tokens nachrüsten. Umgekehrt geht es nicht.

### Headless-Komponenten für die kniffligen Fälle

Für Dialoge, Menüs und Umschalter, bei denen Tastaturbedienung und
Screenreader-Verhalten schnell falsch werden, lohnt sich **Reka UI**
(das Vue-Pendant zu Radix). Es bringt kein Aussehen mit — nur korrektes
Verhalten. Sparsam einsetzen, nicht flächendeckend.

---

## Backend im Detail

### Fastify statt Express

Schneller, hat Schema-Validierung und TypeScript-Unterstützung eingebaut, und die
Plugin-Struktur passt gut zu einer nach Modulen geschnittenen API. Express wäre
auch in Ordnung; Fastify spart Boilerplate.

### Prisma als ORM

Der eigentliche Gewinn ist nicht das Abfragen, sondern:

- **Migrationen**: `prisma migrate dev` schreibt SQL-Migrationsdateien aus
  Schemaänderungen. Das Schema ist damit versioniert und nachvollziehbar.
- **Typen**: aus dem Schema entstehen TypeScript-Typen, die im Backend *und* —
  über gemeinsam genutzte Typdefinitionen — im Frontend gelten.

Wichtig für dieses Projekt: die maßgebliche Schemadefinition liegt in
`prisma/schema.prisma`. Die Datei `db/schema.sql` in diesem Repository ist die
lesbare Referenz und der Startpunkt; sie wird nach Phase 2 aus Prisma erzeugt und
nicht mehr von Hand gepflegt.

### Zod für Validierung

Ein Zod-Schema ist gleichzeitig Laufzeitprüfung und TypeScript-Typ. Für das
Admin-Backend heißt das: die Regel „ein Vers braucht mindestens einen arabischen
Text oder einen lateinischen Text" wird einmal geschrieben und gilt an der API
und im Formular.

---

## Datenbank

**MySQL 8.4** mit:

- Zeichensatz `utf8mb4`, Kollation `utf8mb4_0900_ai_ci` für allgemeine Felder.
- Für arabische Originaltexte: Spalten mit `utf8mb4_bin` **nicht** verwenden —
  aber auch nicht auf die Standard-Kollation für Suchen verlassen. Die App
  normalisiert arabischen Text (Diakritika entfernen, Alef-Formen vereinheitlichen)
  vor dem Vergleich; diese Normalisierung passiert in der Anwendung und wird als
  zusätzliche, indizierte Spalte gespeichert. Details in
  `docs/architecture/05-database.md`.
- InnoDB, Fremdschlüssel eingeschaltet.

> **Warum nicht PostgreSQL?** Weil MySQL gewünscht ist. Fachlich wäre Postgres
> für die Volltextsuche über arabischen Text die bessere Wahl; der Unterschied
> wird durch die anwendungsseitige Normalisierung und eine `search_index`-Tabelle
> weitgehend ausgeglichen. Kein Grund umzuschwenken.

---

## Werkzeuge auf deinem Rechner

Das ist alles, was installiert sein muss:

| Was | Version | Wozu |
|---|---|---|
| **Node.js** | 22 LTS | Führt Frontend-Build und Backend aus |
| **Docker Desktop** | aktuell | Startet MySQL, ohne es zu installieren |
| **Git** | aktuell | Versionierung |
| **VS Code** | aktuell | Editor |

VS Code-Erweiterungen, die hier wirklich etwas bringen:

- **Vue – Official** (früher Volar) — Vue-3-Unterstützung, unverzichtbar
- **Prisma** — Schema-Syntax und Autovervollständigung
- **ESLint** und **Prettier**
- **Error Lens** — zeigt Fehler direkt in der Zeile

---

## Erststart (wenn Phase 1 steht)

```bash
git clone <repo> && cd Mawlid-app
cp .env.example .env          # Datenbank-Zugang, Session-Secret
docker compose up -d mysql    # Datenbank hochfahren
npm install                   # Abhängigkeiten für Frontend und API
npm run db:migrate            # Tabellen anlegen
npm run db:seed               # Inhalte aus data/extracted/ importieren
npm run dev                   # Vite auf :5173, API auf :3000
```

Der Seed-Schritt greift auf die JSON-Dateien zurück, die
`tools/extract-content.mjs` aus der alten `index.html` gezogen hat. Diese
Extraktion ist **bereits gebaut und lauffähig** — sie ist der einzige Teil der
Migration, der heute schon funktioniert:

```bash
node tools/extract-content.mjs
#   content : 111 works, 2512 verses
#   nav     : 38 entries across 7 constants
```

---

## Was du *nicht* brauchst

Damit die Liste nicht länger wird, als sie muss:

- **Kein Nuxt** — kein SSR-Bedarf.
- **Kein Vuex** — Pinia ist der Nachfolger.
- **Kein GraphQL** — die Zugriffsmuster sind wenige und bekannt; REST reicht.
- **Kein Redis** — bei dieser Datenmenge (~2.500 Verse) hält MySQL alles im
  Buffer Pool. Kommt erst in Frage, wenn Live-Sitzungen viele Teilnehmer haben.
- **Kein Kubernetes** — Docker Compose genügt für lokalen Betrieb.
- **Kein Tailwind** — siehe oben.
