# Offline und PWA

Warum die heutige App ohne Netz funktioniert, was der Umbau daran ändert, und
wie man es zurückholt.

> **Zur Einordnung:** Nach ADR-004 wird online-first gebaut. Dieses Kapitel ist
> trotzdem kein Anhang. Es hält fest, was verloren geht, welche Fehler dabei
> auf keinen Fall passieren dürfen, und was Phase 8 zu tun hat.

---

## 1 · Wie es heute funktioniert

Vollständig, und mit sehr wenigen Mitteln.

**Alles ist in einer Datei.** `index.html` ist 2.423.105 Bytes groß und enthält
Inhalt, Stil, Logik und Schriften. Der Service Worker legt sie beim ersten
Besuch in den Cache. Danach braucht die App kein Netz mehr — nicht für den
Start, nicht für einen Text, nicht für die Suche.

**Der Service Worker** ist von Hand geschrieben und macht genau zwei Dinge
richtig, die man leicht falsch macht:

```js
const CACHE = 'mawlid-v379';
const AUDIO_CACHE = 'mawlid-audio';       // ohne Versionsnummer — Absicht
const KEEP = [CACHE, AUDIO_CACHE];
```

1. **Die Seite selbst ist netzwerk-zuerst**, alles andere cache-zuerst. Die
   frühere Fassung war überall cache-zuerst, wodurch ein Deploy, der `sw.js`
   nicht anfasste, die App **dauerhaft einfror** — vom Telefon aus gab es keinen
   Weg heraus. Der Netzversuch bricht nach vier Sekunden ab und fällt auf den
   Cache zurück.

2. **Der Audio-Cache trägt keine Versionsnummer** und steht in der
   Ausnahmeliste. Der Aufräumlauf löscht bei jedem Update alle Caches außer dem
   aktuellen — hätte der Audio-Cache eine Version, verschwänden bei einer
   Tippfehlerkorrektur bis zu **150 MB** heruntergeladener Rezitationen, ohne
   ein Wort.

Beide Punkte stehen als Kommentar im Code, und beide beschreiben einen Fehler,
der schon passiert ist.

**Cache-Version von Hand.** `mawlid-v379` wird bei jedem Inhaltsupdate erhöht.
Vergisst man es, sehen installierte Telefone die Änderung nicht.

### Was das kostet

| | |
|---|---|
| `index.html` | 2.423.105 Bytes |
| davon Schriften (3 base64-Blöcke) | ~831 KB Zeichen ≈ 623 KB Daten — 34 % |
| davon Inhalt | ~1,18 MB |
| Über die Leitung, gepackt | ~976 KB, davon ~521 KB Schriften |

Und: **Inhalt und Logik stehen in einem einzigen blockierenden `<script>`**, das
vollständig geparst und ausgeführt sein muss, bevor das erste Pixel erscheint.
Auf einem älteren Telefon ist das spürbar.

---

## 2 · Was der Umbau daran ändert

Eine Vue-SPA, die Inhalte zur Laufzeit von einer MySQL-API holt, funktioniert
ohne Netz **nicht**. Punkt.

Das ist die eine existenzielle Frage dieses Umbaus, denn der Zweck der App ist
die Rezitation in einer Versammlung — oft in einer Moschee, oft mit schlechtem
oder keinem Netz.

Die Entscheidung ist bewusst gefallen (ADR-004). Daraus folgt:

- **Die alte `index.html` bleibt vorerst liegen** und wird nicht abgeschaltet.
  Sie ist bis Phase 8 die einzige Fassung, die ohne Netz funktioniert. Sie
  einzumotten kostet nichts.
- **Bevor die alte App abgelöst wird, muss das kommuniziert werden.** Wer sie
  heute in der Moschee benutzt, verlässt sich darauf.
- Die API ist so gebaut, dass Phase 8 ein abgegrenztes Arbeitspaket ist und kein
  Neuentwurf: `content_version` je Sammlung, ETags, und ein Endpunkt, der eine
  ganze Sammlung als **ein** in sich geschlossenes Dokument liefert.

---

## 3 · Vier Fehler, die auf keinen Fall passieren dürfen

Diese vier sind nicht theoretisch — jeder ist in einer Umstellung wie dieser
schon jemandem passiert.

### 🔴 1 · Der neue Service Worker löscht den Audio-Cache

`vite-plugin-pwa` mit Workbox räumt standardmäßig alles auf, was es nicht
selbst angelegt hat. `mawlid-audio` gehört dazu. Bis zu 150 MB Rezitationen,
über das Moschee-WLAN heruntergeladen, sind weg.

**Pflicht** — im `injectManifest`-Modus, mit eigenem `sw.ts`:

```ts
// mawlid-audio wird NIEMALS aufgeräumt. Es enthält Dateien, die Menschen
// bewusst heruntergeladen haben und die eine App-Version überdauern müssen.
const KEEP = new Set([CACHE_NAME, 'mawlid-audio'])
```

Das ist kein Sonderfall: **wer etwas Teures cacht, gibt ihm keinen
Versionsnamen und trägt ihn in die Ausnahmeliste ein.**

### 🔴 2 · Die neue App liegt unter einer anderen Herkunft

Läuft die neue App unter einem anderen Ursprung oder Pfad als
`https://zboon.github.io/Mawlid-app/`, ist alles Lokale von den Telefonen
abgeschnitten:

- Die installierte PWA zeigt weiter auf die alte Adresse
- `localStorage` — Favoriten, Leseposition, Markierungen, Theme — ist weg
- Der gesamte Audio-Cache ist weg

**Vor der Umstellung** braucht es einen Übernahmeweg: die alte App bietet einen
Export an, die neue liest ihn ein. Ein paar Kilobyte JSON, aber ohne das ist
jemandes Favoritenliste weg.

### 🔴 3 · Die `unicode-range` verschwindet beim CSS-Umbau

Wird sie beim Umschreiben der `@font-face`-Blöcke „vereinfacht" oder
weggelassen, rendern 171 Codepoints — arabisches Komma, Strichpunkt,
Fragezeichen, Punkt, die Rosette und alle persischen Buchstaben — als
**schwarze Klötze**. Details in `docs/design/02-typography.md` §2.

### 🟠 4 · Ein Build-Werkzeug subsetzt die Schriften

Verletzt bei Uthmani die Lizenz und zerstört die `unicode-range`. Bei Amiri
verlangt die OFL eine Umbenennung der Familie. Siehe
`docs/design/02-typography.md` §3.

---

## 4 · Wie Offline zurückkommt (Phase 8)

Die Empfehlung, wenn es soweit ist.

### Der Ansatz: MySQL bleibt das Autorensystem, nicht die Auslieferung

Der Fehler wäre, die SPA zur Laufzeit gegen die Datenbank sprechen zu lassen und
dann zu versuchen, das irgendwie zu cachen.

Besser ist ein **Veröffentlichungsschritt**:

```
MySQL  ──publish──▶  dalail.<hash>.json
                     mawlid.<hash>.json
                     ahzab.<hash>.json      ──▶ vom Service Worker vorgehalten
```

- Redigiert wird in der Datenbank, mit Rollen und Versionen.
- Ein `publish`-Lauf schreibt je Modul eine JSON-Datei mit Inhaltshash im Namen.
- Der Service Worker hält sie vor. Die laufende App **braucht die Datenbank
  nie** — sie liest die Dateien.
- Ein neuer Hash heißt neue Datei heißt Aktualisierung. Kein Cache-Zähler mehr,
  den man von Hand erhöhen muss.

Das ergibt genau die heutige Eigenschaft — alles da, auch ohne Netz — mit den
Vorteilen der Datenbank.

### Konkret

- **`vite-plugin-pwa` im `injectManifest`-Modus** mit handgeschriebenem
  `src/sw.ts`. Nicht `generateSW`: die Ausnahmeliste für `mawlid-audio` und die
  Netzwerk-zuerst-Regel für die Seite müssen von Hand stehen.
- **`registerType: 'prompt'`**, nicht `autoUpdate`. Eine Aktualisierung mitten
  in einer Rezitation, die die Seite neu lädt, ist genau das Falsche. Ein
  dezenter Hinweis „Neue Fassung verfügbar" und die Person entscheidet.
- **Alle Schriften vorgehalten**, mit
  `Cache-Control: public, max-age=31536000, immutable`.
- **Crimson Pro und Karla selbst hosten.** Heute kommen sie von Google Fonts;
  beim allerersten Start ohne Netz fallen sie auf Systemschriften zurück — nur
  das Arabische ist wirklich garantiert.
- **Persönliche Daten in IndexedDB**, mit Abgleich, sobald wieder Netz da ist.
- **Sichtbare Anzeige** „Offline · Stand vom 4. September". Wer offline liest,
  soll wissen, dass er eine Momentaufnahme sieht.

### Was auch dann nicht offline geht

Und das ist in Ordnung:

- Live-Sitzungen (brauchen naturgemäß Netz)
- Der Admin-Bereich
- Suche über brandneue Inhalte, die im Snapshot noch nicht stehen

---

## 5 · Das Manifest

Bleibt weitgehend wie es ist:

```jsonc
{
  "name": "Mawalid",
  "short_name": "Mawalid",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#FAF5EA",
  "theme_color": "#123528",
  "icons": [ /* 192, 512 (any maskable) */ ]
}
```

Zu ergänzen:

- `"lang": "de"` und `"dir": "ltr"`
- `"categories": ["books", "education"]`
- `"shortcuts"` — „Heutiger Dalāʾil-Teil" direkt vom Startbildschirm. Bei einer
  App, die täglich zur selben Sache geöffnet wird, ist das mehr wert, als es
  klingt.

`theme_color` muss mit dem `<meta name="theme-color">` übereinstimmen und mit
`--brand` im hellen Thema. Heute stimmt es.

---

## 6 · Was auch ohne Offline besser wird

Selbst online-first bringt der Umbau messbare Verbesserungen gegenüber heute:

| | Heute | Nachher |
|---|---|---|
| Erste Ladung | 2,4 MB, ~976 KB gepackt | App-Gerüst ~150 KB + Schriften bei Bedarf |
| Blockierendes Skript | 1,18 MB Inhalt vor dem ersten Pixel | Inhalt kommt nach dem ersten Rendern |
| Ein Text öffnen | sofort (alles schon da) | ein Aufruf, ~10–90 KB |
| Aktualisierung | ganze 2,4-MB-Datei neu | nur die geänderten Bündel |
| Schriften | im HTML, bei jedem Update neu | eigene Dateien, ein Jahr gecacht |

Die Schriften nicht mehr bei jedem Inhaltsupdate mitzuschicken ist allein schon
ein halbes Megabyte je Aktualisierung.
