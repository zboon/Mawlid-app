# Architektur-Entscheidungen (ADR)

Kurze, datierte Festlegungen. Jede Entscheidung nennt den Kontext, die Wahl und
was sie kostet. Wenn eine Entscheidung später gekippt wird, wird sie hier nicht
gelöscht, sondern als *überholt* markiert und die neue darunter gesetzt — sonst
weiß in einem Jahr niemand mehr, warum etwas so ist, wie es ist.

---

## ADR-001 · Vue 3 als Frontend-Framework

**Status:** akzeptiert · 2026-09-04

**Kontext.** Die heutige App ist eine einzelne `index.html` mit rund 15.000
Zeilen handgeschriebenem JavaScript, das HTML als Zeichenketten zusammensetzt und
per `innerHTML` in die Seite schreibt. Das funktioniert erstaunlich gut, ist aber
am Ende seiner Tragfähigkeit: jede neue Ansicht bedeutet eine weitere
`renderXyz()`-Funktion, jeder Klick-Handler muss als globale Funktion auf
`window` liegen, weil er im HTML-String als `onclick="..."` landet, und es gibt
keine Möglichkeit, einen Bereich isoliert zu testen oder wiederzuverwenden.

**Entscheidung.** Neuaufbau mit Vue 3 (Composition API, `<script setup>`),
TypeScript, Vite als Build-Tool.

**Konsequenzen.**
- Es gibt ab jetzt einen Build-Schritt. Die heutige Stärke „Datei doppelklicken
  und es läuft" entfällt.
- Komponenten werden testbar und wiederverwendbar; ein neuer Bereich ist eine
  Route plus ein paar Komponenten statt einer weiteren Render-Funktion.
- TypeScript zwingt den Datenvertrag zwischen API und Oberfläche in eine Form,
  die der Compiler prüft. Bei ~2.500 Versen mit sieben optionalen Feldern ist das
  kein Luxus.

---

## ADR-002 · MySQL als Datenhaltung, Inhalte verlassen den Quellcode

**Status:** akzeptiert · 2026-09-04

**Kontext.** Alle Inhalte stehen heute als JavaScript-Objektliterale in
`index.html`: 111 Werke mit 2.512 Versen, verteilt auf neun Arrays. Reihenfolge,
Gruppierung und die Wochentagszuordnung der Dalāʾil-Portionen stecken in
*Array-Positionen* (`DALAIL_TODAY_IDX = { 1:6, 2:7, ... }` bildet Wochentag auf
Array-Index ab). Ein eingeschobener Eintrag verschiebt stillschweigend alles
dahinter.

**Entscheidung.** Inhalte wandern in eine MySQL-8-Datenbank. Ordnung, Gruppierung
und Zeitpläne werden zu expliziten Spalten und Verknüpfungen.

**Konsequenzen.**
- Redaktion wird ohne Code-Änderung möglich.
- Der Import muss die impliziten Ordnungsregeln einmalig korrekt auflösen; das
  ist der heikelste Teil der Migration und bekommt eine eigene Prüfliste
  (siehe `docs/architecture/07-migration.md`).
- Die App braucht ab sofort einen Server. Siehe ADR-004.

---

## ADR-003 · Node + TypeScript als Backend

**Status:** akzeptiert · 2026-09-04

**Kontext.** Zwischen Vue und MySQL muss eine API sitzen. Zur Wahl standen
Node/TypeScript, Laravel/PHP und ein fertiges Headless-CMS (Directus/Strapi).

**Entscheidung.** Node mit TypeScript. Konkret: **Fastify** als HTTP-Server,
**Prisma** als ORM/Migrations-Werkzeug gegen MySQL, **Zod** für Validierung.

**Begründung.** Eine Sprache für Frontend und Backend. Typen für Inhalte und
API-Antworten werden einmal definiert und auf beiden Seiten benutzt — bei einem
Datenmodell mit so vielen optionalen Vers-Feldern ist das der größte einzelne
Gewinn. Prisma erzeugt aus einem Schema sowohl die Migrationen als auch die
TypeScript-Typen.

**Konsequenzen.**
- Ein fertiges Admin-Backend (wie Directus es geschenkt hätte) muss selbst gebaut
  werden. Das ist bewusst in Kauf genommen, weil die Sonderfälle dieser Inhalte —
  Folio-Bereiche, Wochentagsportionen, segmentierte Verse — in einem generischen
  CMS-Formular ohnehin unschön würden.
- Deployment braucht eine Node-Laufzeit, kein reines PHP-Hosting.

---

## ADR-004 · Online-first; Offline wird vorbereitet, aber nicht gebaut

**Status:** akzeptiert · 2026-09-04

**Kontext.** Die heutige App ist vollständig offlinefähig: Service Worker,
eingebettete Schriften, alle Texte im HTML. Das war kein Nebenprodukt, sondern
der Zweck — rezitiert wird in Versammlungen, oft ohne brauchbares Netz. Eine
Vue-SPA gegen eine MySQL-API hat diese Eigenschaft nicht.

Der Einwand wurde vorgebracht und die Entscheidung fiel bewusst zugunsten von
Online-first: wer eine Datenbank hat, muss sie auch erreichen können.

**Entscheidung.** Die App lädt Inhalte zur Laufzeit über die API. Es wird
zunächst **kein** Offline-Cache gebaut.

**Aber:** die API wird von Anfang an so entworfen, dass ein Offline-Layer später
ohne Umbau nachgerüstet werden kann:

- Jede Sammlung trägt eine `content_version` (monoton steigend, bei jeder
  Änderung erhöht). Ein Client kann fragen „hat sich seit Version N etwas
  geändert?" statt alles neu zu laden.
- Es gibt einen Endpunkt, der eine ganze Sammlung als ein einziges,
  in sich geschlossenes JSON-Dokument liefert (`GET /api/collections/:slug/full`).
  Genau dieses Dokument wäre später der Offline-Snapshot.
- Antworten tragen `ETag` und respektieren `If-None-Match`.

**Konsequenzen.**
- Ohne Netz zeigt die App nichts an. Das ist eine echte Verhaltensänderung
  gegenüber heute und sollte kommuniziert werden, bevor die alte App abgelöst
  wird.
- Die alte `index.html` bleibt zunächst funktionsfähig im Repository liegen und
  wird erst abgeschaltet, wenn die neue App den Alltag trägt.
- Der Weg zurück zu Offline ist ein abgegrenztes, späteres Arbeitspaket
  (siehe Roadmap, Phase 8), kein Neuentwurf.

---

## ADR-005 · Redaktion im Browser, mit Rollen

**Status:** akzeptiert · 2026-09-04

**Kontext.** Inhalte sollen von mehreren Personen gepflegt werden können, aber
nicht jede Person soll alles veröffentlichen dürfen. Arabische Originaltexte sind
empfindlicher als Übersetzungen: ein Tippfehler in der Vokalisierung ändert die
Rezitation.

**Entscheidung.** Ein eingeloggter Admin-Bereich innerhalb derselben Anwendung,
mit vier Rollen:

| Rolle | Darf |
|---|---|
| `reader` | Nur lesen (Standard, auch anonym) |
| `contributor` | Übersetzungen und Notizen bearbeiten, als Entwurf speichern |
| `editor` | Alles bearbeiten, veröffentlichen, Struktur ändern |
| `admin` | Zusätzlich Benutzer, Rollen und Module verwalten |

Änderungen an Inhalten werden versioniert (`content_revisions`), damit ein
falscher Eingriff rückgängig gemacht werden kann.

**Konsequenzen.**
- Braucht Authentifizierung (Session-Cookies, `argon2` für Passwörter), eine
  Rollenprüfung pro Endpunkt und ein Audit-Log.
- Der Entwurf/Veröffentlicht-Zustand zieht sich durch das gesamte Datenmodell
  (`status`-Spalte auf allen redigierbaren Tabellen).

---

## ADR-006 · Lokaler Betrieb via Docker Compose

**Status:** akzeptiert · 2026-09-04

**Kontext.** Die App soll zunächst lokal laufen, nicht öffentlich gehostet
werden. GitHub Pages (der heutige Ort) kann kein MySQL.

**Entscheidung.** `docker-compose.yml` mit drei Diensten: `mysql`, `api`, `web`.
Ein `npm run dev` startet alles; die Datenbank wird beim ersten Start aus
`db/schema.sql` und den generierten Seed-Dateien befüllt.

**Konsequenzen.**
- Kein Hosting-Aufwand, keine Kosten, volle Kontrolle.
- Wer die App benutzen will, muss sie starten — sie ist damit vorerst kein
  Handy-Ersatz für die alte PWA. Das ist eine Zwischenstufe, kein Endzustand.
- Die spätere Veröffentlichung ist ein reines Deployment-Thema und ändert am
  Code nichts, solange Konfiguration über Umgebungsvariablen läuft.

---

## ADR-007 · Modul-Registry statt fest verdrahteter Bereiche

**Status:** akzeptiert · 2026-09-04

**Kontext.** Die App soll mehrere Bereiche unter einem Dach vereinen — Dalāʾil
al-Khayrāt, Mawlid, Silsila, Sohbets, Ottoman — und später Wiki und
Informationsseiten. Heute ist jeder Bereich hart in `TABS`, `TAB_CHILDREN`,
`HOME_CARDS` und je einer Render-Funktion verdrahtet.

**Entscheidung.** Bereiche sind **Module**. Ein Modul ist ein Datensatz in der
Tabelle `modules` (Slug, Titel in mehreren Sprachen, Icon, Reihenfolge,
Sichtbarkeit, Typ) plus eine Frontend-Registrierung, die sagt, welcher
Ansichtstyp die Inhalte darstellt.

Es gibt eine kleine Zahl von **Ansichtstypen** (`recitation`, `article`, `wiki`,
`tree`, `media`, `link`), nicht einen pro Modul. Ein neues Modul, das ein
bestehendes Muster benutzt, ist damit ein Datenbankeintrag — kein neuer Code.

**Konsequenzen.**
- Die Startseite rendert sich aus `modules` und ist damit ohne Deploy umsortierbar.
- Der Preis: ein Modul mit wirklich eigener Darstellung (Silsila als Stammbaum)
  braucht trotzdem einen neuen Ansichtstyp. Das ist richtig so — die Alternative
  wäre ein Konfigurationsformat, das irgendwann selbst eine Programmiersprache wird.
