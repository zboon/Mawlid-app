# API

Fastify + TypeScript + Prisma. Was sie anbietet und nach welchen Regeln.

---

## Drei Zonen

Die API zerfällt in drei Bereiche mit völlig unterschiedlichen Regeln. Diese
Trennung ist die wichtigste Entwurfsentscheidung — sie hält Zwischenspeicherung
und Rechteprüfung auseinander.

| Zone | Pfad | Auth | Cache | Schreiben |
|---|---|---|---|---|
| **Inhalt** | `/api/content/*` | keine | aggressiv, ETag | nein |
| **Persönlich** | `/api/me/*` | Login oder Geräte-ID | nie | ja |
| **Redaktion** | `/api/admin/*` | Rolle | nie | ja |

Jede Zone ist ein eigenes Fastify-Plugin mit eigenem `preHandler`. Ein Endpunkt
kann nicht versehentlich in die falsche Zone rutschen.

---

## Zone 1 · Inhalt

Alles Veröffentlichte. Anonym lesbar, stark gecacht.

```
GET /api/content/modules
GET /api/content/modules/:slug
GET /api/content/collections/:slug
GET /api/content/works/:slug
GET /api/content/works/:slug/full
GET /api/content/schedule/:collection/today
GET /api/content/sequences/:slug
GET /api/content/search?q=…&lang=…&limit=…
GET /api/content/articles/:slug
GET /api/content/collections/:slug/full      ← der spätere Offline-Snapshot
```

### Ein Werk kommt in einem Stück

```http
GET /api/content/works/dienstag?lang=de
```

```jsonc
{
  "slug": "dienstag",
  "collection": { "slug": "wochenteile", "module": "dalail" },
  "primaryScript": "arab",
  "primaryLang": "ar",
  "cartouche": "دَلَائِلُ الْخَيْرَاتِ",
  "hasFolios": true,
  "titles":  { "ar": "…", "en": "Tuesday", "de": "Dienstag" },
  "notes":   { "de": "…" },
  "verses": [
    {
      "position": 0,
      "kind": "verse",
      "bandLabel": null,
      "noteLabel": null,
      "separator": null,
      "noRosette": false,
      "shortPage": false,
      "texts": {
        "original":        { "lang": "ar", "script": "arab", "body": "…۞…" },
        "transliteration": { "lang": "ar", "script": "latn", "body": "…" },
        "translation":     { "lang": "de", "script": "latn", "body": "…" }
      }
    }
  ],
  "folios": [ { "position": 0, "from": 0, "to": 128, "hasSections": false, "bandLabel": null } ],
  "media":  [ { "kind": "audio", "provider": "file", "url": "…", "durationSeconds": 1348,
                "reciter": { "slug": "khayzaran", "nameLatin": "Ḥakīm Khayzarān", "nameAr": "…" } } ],
  "contentVersion": 42
}
```

**Warum alles auf einmal:** Der größte Text hat 213 Verse, das sind rund 90 KB
JSON. Ein Wasserfall aus Einzelabfragen wäre hier deutlich langsamer als eine
große Antwort — und die Buchansicht braucht ohnehin alle Verse gleichzeitig, um
die Blatthöhen zu berechnen.

**`?lang=`** wählt die Übersetzung. Fehlt sie, fällt die API auf Englisch
zurück und sagt das im Feld `langFallback`. Der Originaltext und die Umschrift
kommen immer mit, unabhängig von `lang`.

### Zwischenspeicherung

```http
Cache-Control: public, max-age=60, stale-while-revalidate=600
ETag: "work-wochenteile-tuesday-en-42-QM6Xra0Vqd"
```

Der ETag hat **drei** Teile: Bereich, `content_version` der Sammlung und ein
kurzer Abdruck des Rumpfes. Bei `If-None-Match` antwortet die API mit
`304 Not Modified` und überträgt nichts; Listen mit mehreren Einträgen und das
`W/`-Präfix werden erkannt.

**Warum der Abdruck dazukam** (Phase 3, gegenüber dem ursprünglichen Entwurf
„ETag ist `content_version`"): `content_version` hängt an der **Sammlung**. Eine
umbenannte Modulüberschrift, eine geänderte Beschreibung, ein neuer
Sprachrückfall — nichts davon berührt den Zähler, und der Client behielte eine
veraltete Antwort, bis irgendwer die Sammlung anfasst. Der Zähler bleibt im
Tag, weil er die Vorkehrung aus ADR-004 trägt und weil man ihm ansieht, was er
bedeutet; der Abdruck schließt die Lücke, ohne dass man sich auf Zähler
verlassen muss, die noch niemand erhöht.

Der Preis ist ehrlich zu benennen: der Server **baut** die Antwort auch dann,
wenn er sie nicht sendet. Gespart wird die Übertragung, nicht die Abfrage. Auf
einem Telefon ist genau das der Engpass — 100 KB Verstext gegen einen
Datenbankzugriff von wenigen Millisekunden.

### `?lang=` nur beim Werk

Die **Listen** (Module, Sammlungen) liefern *alle* Titel als Objekt
(`titles: { ar, de, en }`) und haben absichtlich kein `?lang`. Zwei Gründe: die
Startkachel zeigt ohnehin zwei Sprachen gleichzeitig (arabisch groß,
Landessprache klein), und eine Antwort für alle Sprachen ist kleiner als vier
Cache-Einträge.

Beim **Werk** wählt `?lang` die Übersetzung, weil dort die Menge zählt: die
Übersetzungen machen den größeren Teil der 100 KB aus. Originaltext und
Umschrift kommen immer mit.

### Doppelte Kürzel

Kürzel sind laut Schema nur innerhalb ihrer Ebene eindeutig
(`uq_works_slug (collection_id, slug)`). Heute kollidiert keines — aber „heute
nicht" ist keine Zusicherung. Findet die API mehrere, antwortet sie mit **409**
und nennt die Kandidaten, statt still eine Zeile zu wählen; `?collection=` und
`?module=` lösen es auf. Ein falsches Werk auszuliefern wäre der schlimmere
Ausgang, und es fiele niemandem auf.

### Suche

```http
GET /api/content/search?q=muhamad&lang=de
```

```jsonc
{
  "query": "muhamad",
  "normalized": "muhamad",
  "groups": [
    {
      "module": "mawlid",
      "collection": "daybai",
      "works": [
        {
          "slug": "ya-nabi-salam-alayka",
          "titles": { "ar": "…", "de": "…" },
          "hits": [
            { "versePosition": 12, "segmentIndex": 1, "role": "original",
              "snippet": "… <mark>محمد</mark> …" }
          ],
          "moreHits": 3
        }
      ]
    }
  ]
}
```

Höchstens sechs Treffer je Werk, `moreHits` zählt den Rest. Die Gruppierung
folgt der Reihenfolge der Module.

---

## Zone 2 · Persönlich

Favoriten, Lesepositionen, Markierungen, Einstellungen.

```
GET    /api/me
GET    /api/me/favorites
PUT    /api/me/favorites/:workSlug
DELETE /api/me/favorites/:workSlug
GET    /api/me/positions
PUT    /api/me/positions/:workSlug
GET    /api/me/marks?work=…
PUT    /api/me/marks/:verseId/:segmentIndex
DELETE /api/me/marks/:verseId/:segmentIndex
GET    /api/me/settings
PUT    /api/me/settings
```

### Ohne Anmeldung

Die App wird überwiegend anonym benutzt, und das soll so bleiben. Der Client
erzeugt beim ersten Start eine Geräte-ID und schickt sie mit:

```http
X-Device-Id: 7f3a…-uuid
```

Ist zusätzlich jemand angemeldet, gilt das Konto. Beim Anmelden werden die
Gerätedaten übernommen.

### Immer auch lokal

Diese Daten liegen **zusätzlich** im `localStorage` und werden im Hintergrund
abgeglichen. Sie sind klein, sie gehören der Person, und sie sind das Einzige,
was auch bei ausgefallener API sofort da sein muss.

Bei Konflikt gewinnt der neuere Zeitstempel. Bei Favoriten ist die Vereinigung
richtig — ein Favorit, der auf einem Gerät verschwindet, ist ärgerlicher als
einer zu viel.

---

## Zone 3 · Redaktion

```
POST   /api/admin/auth/login
POST   /api/admin/auth/logout
GET    /api/admin/works?status=draft
POST   /api/admin/works
PATCH  /api/admin/works/:id
POST   /api/admin/works/:id/publish
GET    /api/admin/works/:id/revisions
POST   /api/admin/works/:id/revisions/:rev/restore
PUT    /api/admin/verses/:id
POST   /api/admin/verses/reorder
PUT    /api/admin/schedules/:id/slots
PUT    /api/admin/sequences/:id/items
GET    /api/admin/users
PATCH  /api/admin/users/:id/role
GET    /api/admin/corrections
PATCH  /api/admin/corrections/:id
```

**Jeder schreibende Aufruf:**

1. Prüft die Rolle
2. Schreibt den Zustand **vor** der Änderung nach `content_revisions`
3. Führt die Änderung aus
4. Erhöht die `content_version` der betroffenen Sammlung
5. Schreibt ins `audit_log`

Die Schritte 2, 4 und 5 stehen in einem gemeinsamen Wrapper — nicht in jedem
Endpunkt. Sonst vergisst der zwanzigste Endpunkt einen davon.

---

## Validierung

Ein Zod-Schema je Endpunkt, für Eingabe **und** Ausgabe:

```ts
export const VerseTextInput = z.object({
  lang:   z.enum(['ar', 'de', 'en', 'tr']),
  role:   z.enum(['original', 'transliteration', 'translation']),
  script: z.enum(['arab', 'latn']),
  body:   z.string().min(1).max(8000),
})

export type VerseTextInput = z.infer<typeof VerseTextInput>
```

Die Schemas liegen in `packages/shared` und gelten auf beiden Seiten. Das
Admin-Formular prüft mit demselben Schema wie der Server — und wenn sich das
Schema ändert, weist der Compiler auf jede betroffene Stelle hin.

### Eine Regel, die man leicht falsch baut

**Arabischer Text wird niemals „bereinigt".** Kein `trim()`, keine
Unicode-Normalisierung, kein Zusammenziehen von Leerzeichen, kein Umwandeln von
Anführungszeichen. Die einzige erlaubte Ableitung ist `body_search`, und die
steht in einer anderen Spalte.

Das gilt für die Validierung genauso wie für den Import. Ein `.trim()` im
falschen Zod-Schema löscht ein bedeutungstragendes Leerzeichen und niemand merkt
es.

---

## Fehlerformat

Einheitlich, überall:

```jsonc
{
  "error": {
    "code": "WORK_NOT_FOUND",
    "message": "No published work with slug 'dienstagg'.",
    "details": null
  }
}
```

| Status | Wann |
|---|---|
| `400` | Eingabe verletzt das Schema |
| `401` | Nicht angemeldet |
| `403` | Angemeldet, aber Rolle reicht nicht |
| `404` | Gibt es nicht — oder ist unveröffentlicht und du darfst es nicht sehen |
| `409` | Konflikt (Slug vergeben, Version veraltet) |
| `422` | Schema erfüllt, aber fachlich unmöglich |
| `500` | Unser Fehler. Wird geloggt, Details gehen nicht nach außen |

**`404` statt `403` für Unveröffentlichtes.** Ein `403` verriete, dass es das
Ding gibt.

---

## Warum kein GraphQL

Wurde erwogen und verworfen.

GraphQL lohnt sich, wenn viele verschiedene Clients unterschiedliche Ausschnitte
brauchen. Hier gibt es **einen** Client, und die Zugriffsmuster sind bekannt und
wenige: Modul auflisten, Sammlung auflisten, Werk vollständig laden, suchen.

Der Preis wäre spürbar: N+1-Probleme bei verschachtelten Versen, kaum brauchbares
HTTP-Caching (alles ist ein POST auf `/graphql`) und ein zusätzliches
Werkzeugbündel. Für die drei Endpunkte, die das Frontend wirklich braucht, ist
REST kürzer und schneller.

---

## Reihenfolge beim Bauen

1. `/api/content/modules` und `/collections` — Startseite und Listen
2. `/api/content/works/:slug` — der Leser
3. `/api/content/schedule/:collection/today` — „heute dran"
4. `/api/content/search` — nachdem die Normalisierung übernommen ist
5. `/api/me/*` — Favoriten, Positionen
6. `/api/admin/*` — Redaktion
7. `/ws` — Live-Sitzungen

Nach Schritt 3 kann die neue App bereits als Lesegerät benutzt werden. Das ist
der erste Punkt, an dem sich der Umbau anfühlt wie Fortschritt.
