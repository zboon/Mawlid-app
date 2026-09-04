# Mawalid — Frontend

Vue 3 + TypeScript + Vite. Stand: **Phase 3** — Startseite, Modul- und
Sammlungsansichten, Leser in beiden Fassungen. Alle Inhalte kommen aus der API.

## Starten

Die API muss laufen, sonst zeigt jede Seite „Die API ist nicht erreichbar":

```bash
npm --prefix ../api run dev    # http://127.0.0.1:3000
npm install
npm run dev                    # http://localhost:5173
```

### Wohin die Anfragen gehen

Im Entwicklungsbetrieb **leitet Vite `/api` an die API weiter**
(`server.proxy` in `vite.config.ts`, Ziel aus `API_PORT`). Alles läuft damit
über eine Herkunft: kein CORS, keine zweite Adresse in der Konfiguration, und
`http://localhost:5173/api/content/modules` lässt sich im Browser direkt
aufrufen.

`VITE_API_URL` braucht man nur, wenn die API woanders steht. Ist sie gesetzt,
gilt sie, und die Weiterleitung bleibt ungenutzt — dann muss `CORS_ORIGIN` der
API zur Adresse passen, unter der die Seite geöffnet wird. **`localhost` und
`127.0.0.1` sind für den Browser verschiedene Herkünfte**; passt es nicht,
bleibt die Seite leer und im Serverprotokoll steht kein Wort davon. Beide
Schreibweisen stehen deshalb in der Vorgabe.

### Die `.env` liegt im Wurzelverzeichnis

`envDir` in `vite.config.ts` zeigt dorthin. Ohne diese Zeile sucht Vite die
Datei hier in `apps/web`, findet nichts, `VITE_API_URL` bleibt leer — und ohne
Weiterleitung ging dann jede Anfrage an den Vite-Server selbst und kam als
**404** zurück. Genau so ist es beim ersten Aufsetzen passiert.

Oder über den Compose-Verbund aus dem Projektwurzelverzeichnis:

```bash
docker compose up web
```

## Befehle

| | |
|---|---|
| `npm run dev` | Entwicklungsserver mit HMR |
| `npm run build` | Typprüfung und Produktions-Build nach `dist/` |
| `npm run verify` | Typen, Lint, Token-Prüfung und Tests — das, was vor jedem Commit läuft |
| `npm run check:tokens` | Nur die Token-Prüfung |
| `npm run test` | Vitest |

### Die Token-Prüfung

`npm run check:tokens` durchsucht die `<style>`-Blöcke aller Komponenten nach
literalen Farben und Abständen und schlägt fehl, wenn sie welche findet.

Das ist die eine Regel, an der das Design-System hängt: fehlt ein Wert, wird er
**erst** in `docs/design/01-tokens.md` eingetragen und dann in
`src/styles/tokens.css` umgesetzt — nicht in der Komponente improvisiert. Ohne
diese Prüfung wäre die Regel eine Bitte; mit ihr bleibt eine Palettenänderung
eine Änderung an einer Datei.

Bauteilmaße (`width`, `height`) sind ausdrücklich ausgenommen: die Größe eines
Knopfes gehört zu diesem Knopf, nicht in die globale Skala.

## Aufbau

```
src/
  styles/
    tokens.css        Umsetzung von docs/design/01-tokens.md
    fonts-latin.css   erzeugt von tools/fetch-latin-fonts.mjs
    base.css          Resets, Schriften, globale Modi, Fokus
  components/         der Baukasten aus docs/design/04-components.md
  views/              eine Datei je Route
  stores/             Pinia — Thema und Lesereinstellungen
  composables/        ein Verhalten je Datei, samt Aufräumen
  api/                der einzige Ort mit fetch, plus die Query-Definitionen
  lib/                reine Funktionen: Text zerlegen, Blätter bauen, Titel wählen
  i18n/               Oberflächentexte — NICHT die Inhaltsübersetzungen
public/
  fonts/              echte Dateien statt base64 im HTML
  img/                die Kalligrafien
```

## Die drei Stellen, an denen man sich verirren kann

**`lib/pages.ts` — `buildLeaves()`.** Die Seitengrenzen der Buchansicht kommen
**nicht** aus den Folio-Angaben, sondern aus dem Zeichen `‖` im Verstext. Aus
46 Folio-Einträgen werden 272 Blätter. `lib/pages.test.ts` hält die Zahl fest.

**`composables/useManuscriptFit.ts`.** Er sucht die Klassennamen `.ms-page` und
`.ms-text`. Wer sie umbenennt, bekommt eine Buchansicht ohne Höhenanpassung —
ohne Fehlermeldung, nur ohne Manuskript.

**Globale Regeln in `base.css`.** Sie dürfen nur Namen nennen, die es genau
einmal gibt. `html.immersive .head` traf auch `.band.head` und ließ im Vollbild
die Illumination des ersten Blattes verschwinden. Seither: `.reader-head`,
`.ms-hint`.

## Was hier bewusst nicht steht

**Kein Tailwind, kein UI-Framework.** Das Design lebt von einer sehr
spezifischen Palette, von arabischer Typografie mit Vokalisierung und von
Ornamenten wie der Rosette. Ein Utility-Framework würde diese Regeln über
tausende Klassennamen im Markup verstreuen, statt sie an einem Ort
festzuhalten — und genau das Festhalten ist die Anforderung. Begründung in
`docs/plan/tech-stack.md`.

## Schriften

Alle Schriften liegen als Dateien unter `public/fonts/`, keine von Google zur
Laufzeit. Die arabischen kommen aus der alten `index.html`
(`tools/extract-assets.mjs`), die lateinischen von Google, aber einmalig
heruntergeladen (`tools/fetch-latin-fonts.mjs`).

**Die `unicode-range` an `UthmanicHafs` in `base.css` nicht anfassen.** Sie ist
eine handgeprüfte Liste der Zeichen, die die Schrift wirklich zeichnet; alles
andere fällt absichtlich auf Amiri durch. Ohne sie erscheinen das arabische
Komma, das Fragezeichen, die Rosette und alle persischen Buchstaben als
schwarze Klötze. Ebenso: die Uthmani-Datei darf nicht subgesetzt werden — die
Lizenz verbietet Änderungen. Siehe `public/fonts/LICENSES/README.md`.
