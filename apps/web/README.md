# Mawalid — Frontend

Vue 3 + TypeScript + Vite. Phase 1 der Roadmap: das Gerüst, das Design-System
und die Startseite. Inhalte kommen ab Phase 3 aus der API.

## Starten

```bash
npm install
npm run dev          # http://localhost:5173
```

Oder über den Compose-Verbund aus dem Projektwurzelverzeichnis:

```bash
docker compose up web
```

## Befehle

| | |
|---|---|
| `npm run dev` | Entwicklungsserver mit HMR |
| `npm run build` | Typprüfung und Produktions-Build nach `dist/` |
| `npm run verify` | Typen, Lint und Token-Prüfung — das, was vor jedem Commit läuft |
| `npm run check:tokens` | Nur die Token-Prüfung |

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
  stores/             Pinia
  i18n/               Oberflächentexte — NICHT die Inhaltsübersetzungen
  data/               Platzhalter, wird in Phase 3 durch die API ersetzt
public/
  fonts/              echte Dateien statt base64 im HTML
  img/                die Kalligrafien
```

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
