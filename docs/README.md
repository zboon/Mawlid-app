# Dokumentation

Der Umbau der Mawalid-App von einer einzelnen `index.html` zu einer zentralen
Vue-Anwendung mit MySQL-Datenbank.

---

## Wo anfangen

**Wenn du wissen willst, was Sache ist:**
→ [`analysis/befunde.md`](analysis/befunde.md) — was die Untersuchung der
bestehenden App ergeben hat, inklusive zweier echter Fehler, die heute behoben
werden können.

**Wenn du wissen willst, wie es weitergeht:**
→ [`plan/roadmap.md`](plan/roadmap.md) — acht Phasen, jede mit einem
vorzeigbaren Ergebnis.

**Wenn du wissen willst, was du dafür brauchst:**
→ [`plan/tech-stack.md`](plan/tech-stack.md) — die Einkaufsliste, und was du
davon wirklich lernen musst.

**Wenn du anfangen willst zu bauen:**
→ [`design/01-tokens.md`](design/01-tokens.md) und
[`design/03-layout.md`](design/03-layout.md) — damit beginnt Phase 1.

---

## Alle Dokumente

### Analyse

| | |
|---|---|
| [`analysis/befunde.md`](analysis/befunde.md) | Fehler, unfertige Inhalte, was die App gut macht, Kennzahlen |

### Design

Das verbindliche Regelwerk für das Aussehen. Bei Widerspruch zwischen diesen
Dokumenten und dem Code hat die Dokumentation recht.

| | |
|---|---|
| [`design/00-design-system.md`](design/00-design-system.md) | Die fünf Gestaltungsprinzipien und wie Anpassungen ablaufen |
| [`design/01-tokens.md`](design/01-tokens.md) | Farben, Abstände, Radien, Schatten, Bewegung, Ebenen |
| [`design/02-typography.md`](design/02-typography.md) | Schriften, arabische Typografie, RTL, die `unicode-range` |
| [`design/03-layout.md`](design/03-layout.md) | Seitengerüst, Kopfleisten, das 3×3-Startraster, der Leser |
| [`design/04-components.md`](design/04-components.md) | Der Baukasten |
| [`design/05-patterns.md`](design/05-patterns.md) | Navigation, Suche, Zustände, Medien |
| [`design/06-accessibility.md`](design/06-accessibility.md) | Kontrast, Tastatur, Screenreader — und was heute fehlt |
| [`design/07-adding-a-module.md`](design/07-adding-a-module.md) | Anleitung und Prüfliste für einen neuen Bereich |

### Architektur

| | |
|---|---|
| [`architecture/01-overview.md`](architecture/01-overview.md) | Die Schichten, der Datenfluss, die Verzeichnisstruktur |
| [`architecture/02-modules.md`](architecture/02-modules.md) | Wie „mehrere Apps in einer" funktioniert |
| [`architecture/03-frontend.md`](architecture/03-frontend.md) | Vue-Aufbau, Composables, arabischer Text, Tests |
| [`architecture/04-backend-api.md`](architecture/04-backend-api.md) | Die drei API-Zonen, Endpunkte, Validierung |
| [`architecture/05-database.md`](architecture/05-database.md) | Das Schema und warum es so ist |
| [`architecture/06-auth-roles.md`](architecture/06-auth-roles.md) | Anmeldung, Rollen, Versionierung |
| [`architecture/07-migration.md`](architecture/07-migration.md) | 111 Werke, 2.512 Verse — ohne Zeichenverlust |
| [`architecture/08-live-sessions.md`](architecture/08-live-sessions.md) | Führen und Folgen bei einer Versammlung |
| [`architecture/09-offline-pwa.md`](architecture/09-offline-pwa.md) | Was offline verloren geht, welche Fehler tödlich wären, wie es zurückkommt |

### Plan

| | |
|---|---|
| [`plan/roadmap.md`](plan/roadmap.md) | Acht Phasen |
| [`plan/tech-stack.md`](plan/tech-stack.md) | Werkzeuge |
| [`plan/decisions.md`](plan/decisions.md) | Die zehn Architekturentscheidungen und ihre Begründung |

---

## Was heute schon läuft

Stand: **Phase 3 abgeschlossen.** Man kann in der neuen App lesen — in der
Lese- und in der Buchansicht, mit Ton.

```bash
cp .env.example .env               # einmalig; .env ist NICHT im Repository
npm install                        # dann je einmal in apps/api und apps/web
npm run db:all                     # extrahieren, aufbereiten, laden, prüfen
npm run api                        # http://127.0.0.1:3000
npm run web                        # http://localhost:5173
```

Die `.env` im Wurzelverzeichnis reicht für alles — Datenbank, API und der
Compose-Verbund teilen sie sich.

Die drei Prüfungen, die den Bestand absichern:

```bash
npm run db:verify                  # 12 Prüfungen: Datenbank gegen die Quelle
npm run api:check                  # 10 Prüfungen: API gegen die Datenbank
npm --prefix apps/web run verify   # Typen, Lint, Token-Regel, Tests
```

`npm run db:verify` vergleicht **byteweise**, ohne Toleranz; `npm run api:check`
setzt das über HTTP fort. Zusammen decken sie die ganze Strecke ab:
`index.html → MySQL → JSON → Browser`.

`db/schema.sql` ist das vollständige Datenbankschema, ausführbar.
`apps/api/prisma/schema.prisma` wird daraus **erzeugt** (`db:pull`), nicht
gepflegt.

---

## Die getroffenen Entscheidungen

Kurzfassung, vollständig in [`plan/decisions.md`](plan/decisions.md):

| | |
|---|---|
| **Frontend** | Vue 3 + TypeScript + Vite |
| **Backend** | Node + TypeScript (Fastify + Prisma + Zod) |
| **Datenbank** | MySQL 8.4 |
| **Betrieb** | Docker Compose, lokal |
| **Offline** | Zunächst nicht — aber die API ist darauf vorbereitet |
| **Redaktion** | Admin-Oberfläche im Browser, vier Rollen |
| **Styling** | Reines CSS mit Design-Tokens, kein Framework |

---

## Die Regeln, an denen alles hängt

Wenn du nur drei Dinge aus diesem Verzeichnis behältst:

**1 · Kein literaler Wert im Komponenten-Code.**
Keine Farbe, kein Abstand, kein Radius. Fehlt ein Token, wird er erst in
[`01-tokens.md`](design/01-tokens.md) eingetragen und dann benutzt. Das ist der
einzige Grund, warum das Design in einem Jahr noch zusammenpasst.

**2 · Arabischer Text wird niemals „bereinigt".**
Kein `trim()`, keine Unicode-Normalisierung, kein Zusammenziehen von
Leerzeichen. Die einzige erlaubte Ableitung ist die Suchspalte, und die steht
woanders. Ein verlorenes Harakat ist ein Fehler höchster Priorität.

**3 · Ein neues Modul ist ein Datensatz, kein Deploy.**
Solange es ein vorhandenes Muster benutzt. Wenn du für einen neuen Bereich Code
schreibst, prüfe erst, ob du wirklich musst
([`07-adding-a-module.md`](design/07-adding-a-module.md)).
