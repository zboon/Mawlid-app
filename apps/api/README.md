# API

Fastify + Prisma + Zod über der MySQL aus Phase 2. Was sie anbietet und warum,
steht in `docs/architecture/04-backend-api.md`; hier steht, wie man sie startet.

## Starten

Aus dem **Projektwurzelverzeichnis**, einmal:

```bash
cp .env.example .env                # Windows: copy .env.example .env
```

Dann hier:

```bash
npm install                         # erzeugt dabei den Prisma-Client
npm run dev                         # http://127.0.0.1:3000
```

**`.env` liegt absichtlich nicht im Repository** und muss nach dem Klonen
einmal angelegt werden. Fehlt sie, endet der Start sofort mit einer Meldung,
die den Pfad nennt — nicht erst beim ersten Leser. Dasselbe gilt für eine nicht
laufende Datenbank.

Gelesen werden **zwei** Dateien, in dieser Reihenfolge: die im
Wurzelverzeichnis und danach `apps/api/.env`. Die eine im Wurzelverzeichnis
reicht für alles — Datenbank, API und Compose-Verbund teilen sie sich. Eine
Datei hier daneben überschreibt einzelne Werte, falls die API einmal woanders
hinzeigen soll.

### „@prisma/client did not initialize yet"

Der Prisma-Client ist **erzeugter** Code: `prisma generate` liest
`prisma/schema.prisma` und schreibt daraus die getypte Fassung nach
`node_modules/.prisma/client`. Vor dem ersten Lauf liegt dort nur ein Platzhalter,
der genau diese Meldung wirft.

`npm install` erledigt das über `postinstall` mit. Wer die Meldung trotzdem
sieht — weil `npm install` mit `--ignore-scripts` lief oder `node_modules`
von Hand angefasst wurde:

```bash
npm run db:generate
```

Das braucht **keine** laufende Datenbank und kein `.env`.

## Endpunkte (Phase 3–4)

| Pfad | Was |
|---|---|
| `GET /health` | lebt der Prozess |
| `GET /api/content/modules` | alle Module fürs 3×3-Raster |
| `GET /api/content/modules/:slug` | ein Modul mit seinen Sammlungen |
| `GET /api/content/collections/:slug` | eine Sammlung mit ihren Werken |
| `GET /api/content/works/:slug` | ein Werk **vollständig** — Verse, Blätter, Medien, Glossen |
| `GET /api/content/schedule/:collection/today` | was heute dran ist |
| `GET /api/content/search?q=…` | Suche über den ganzen Bestand, Vierfach-ODER der Vorlage; je Werk bis sechs Verstreffer plus Restzahl |
| `GET /api/me` | der persönliche Zustand eines Geräts (Header `X-Device-Id`): Favoriten, Positionen, Markierungen, Einstellungen |
| `PUT/DELETE /api/me/favorites/:collection/:work` | Favorit setzen/entfernen |
| `PUT/DELETE /api/me/positions/:collection/:work` | Leseposition je Werk; `DELETE /api/me/positions?collection=…` räumt einen Bereich |
| `PUT/DELETE /api/me/marks/:verseId/:segmentIndex` | Markierung je Versabschnitt; `DELETE /api/me/marks?collection=…` räumt einen Bereich |
| `PUT /api/me/settings` | Anzeigeeinstellungen (nur mitgeschickte Felder ändern sich) |

### `?lang=`

Nur beim Werk. Der Originaltext und die Umschrift kommen immer mit; `lang`
wählt die **Übersetzung**. Fehlt sie, fällt die API zurück und sagt das in
`langFallback`. Heute gibt es nur englische Übersetzungen, `?lang=de` liefert
also Englisch mit `langFallback: "de"`.

Die Listen haben absichtlich kein `?lang`: ihre Titel sind wenige Kilobyte, und
die Startkachel zeigt ohnehin zwei Sprachen gleichzeitig. Eine Antwort für alle
Sprachen ist dort kleiner als vier Cache-Einträge.

### `?collection=` und `?module=`

Kürzel sind laut Schema nur innerhalb ihrer Ebene eindeutig
(`uq_works_slug (collection_id, slug)`). Heute kollidiert keines. Wenn doch,
antwortet die API mit **409** und nennt die Kandidaten, statt still eines zu
wählen; diese Parameter lösen es auf.

## Zwischenspeicherung

```
ETag: "work-wochenteile-tuesday-en-1-QM6Xra0Vqd"
Cache-Control: public, max-age=60, stale-while-revalidate=600
```

Drei Teile: Bereich, `content_version` der Sammlung, kurzer Abdruck des
Rumpfes. Der Zähler ist der Teil, der später den Offline-Abgleich trägt
(ADR-004); der Abdruck deckt ab, was der Zähler heute nicht erfasst — eine
umbenannte Modulüberschrift zum Beispiel erhöht `content_version` nicht.

`If-None-Match` wird beantwortet, auch als Liste und mit `W/`-Präfix.

## Prisma

`prisma/schema.prisma` ist **erzeugt**, nicht gepflegt:

```bash
npm run db:pull        # liest die laufende Datenbank aus
npm run db:generate
```

Die Spaltennamen bleiben dabei so, wie sie in `db/schema.sql` stehen
(`short_page`, nicht `shortPage`). Von Hand umbenannte Felder wären beim
nächsten `db:pull` wieder weg. Die Umbenennung passiert genau einmal, in
`src/routes/content.ts`, beim Bauen der Antwort.

Die drei Ansichten (`v_schedule_today`, `v_collection_counts`,
`v_folio_verses`) erscheinen nicht im Prisma-Schema — Prisma bildet Views nur
hinter einer Vorschaufunktion ab. Sie werden dort benutzt, wo sie helfen, über
`$queryRaw`.

## Kein Übersetzungsschritt

`npm start` läuft über `tsx`, nicht über ein `dist/`. Der Grund steht im
Dockerfile.
