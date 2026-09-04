# Datenbank

Begleittext zu `db/schema.sql`. Erklärt die Entscheidungen, nicht die Spalten —
die stehen kommentiert im Schema selbst.

---

## 1 · Der Kern in einem Satz

```
modules → collections → works → verses → verse_texts
```

Ein **Modul** ist ein Bereich der App. Eine **Sammlung** ist eine Gruppe darin.
Ein **Werk** ist ein lesbares Stück. Ein **Vers** ist eine Zeile. Ein
**Verstext** ist dieser Vers in einer Sprache und einer Rolle.

Alles Weitere hängt daran: Folios, Medien, Zeitpläne, Lesereihenfolgen.

---

## 2 · Die vier Probleme, die das Schema löst

### 2.1 Ordnung, die in Zeichenketten versteckt ist

Der Mawlid ad-Daybaʿī wird als **eine** durchgehende Folge gelesen. Diese Folge
ist aber aus **zwei** Arrays verschränkt (`QASIDAS` und `SIRAH_CHAPTERS`), und
die Reihenfolge steht als Zahl im englischen Titel:

```js
titleEnglish: "13 · Yā Nabī Salām ʿAlayka — Mawlid version"
titleEnglish: "13b · …"     // "b" bedeutet: +0,5, also dazwischen eingefügt
titleEnglish: "Qaṣīdatu s-Salām"   // keine Zahl → gehört nicht zum Mawlid
```

Die App liest die Zahl mit einem regulären Ausdruck aus dem Titel, sortiert
danach und nummeriert dann von 1 an durch, damit keine Lücke sichtbar wird.

Das ist Fachlogik in einem Anzeigetext. Wer einen Titel korrigiert, kann die
Lesereihenfolge zerstören.

**Lösung:** Die Tabellen `sequences` und `sequence_items`. Die laufende Position
ist `ordinal`, die Nummer der Vorlage bleibt als `source_label` erhalten — sonst
ginge beim Einfügen eines fehlenden Abschnitts die Zuordnung zum gedruckten Buch
verloren.

### 2.2 Zeitpläne, die auf Array-Indizes zeigen

```js
const DALAIL_TODAY_IDX  = { 1:6, 2:7, 3:8, 4:9, 5:10, 6:11, 0:12 };
const AZAM_TODAY_IDX    = { 0:5, 1:6, 2:7, 3:8, 4:9, 5:10, 6:4 };
const ISTIGHFAR_TODAY_IDX = { 0:13, 1:14, 2:15, 3:16, 4:17, 5:11, 6:12 };
```

Drei Tabellen, die einen Wochentag auf eine **Array-Position** abbilden. Wird
irgendwo ein Kapitel eingeschoben, zeigt die App am Dienstag den Mittwochsteil —
ohne Fehlermeldung.

**Lösung:** `schedules` + `schedule_slots` mit echtem Fremdschlüssel auf
`works.id`. Ein `slot_index` erlaubt mehrere Teile pro Wochentag (Montag hat bei
den Dalāʾil zwei).

### 2.3 Drei feste Textspalten

```js
{ ar: "…", tr: "…", en: "…" }
```

Zwei Probleme:

- Deutsch passt nirgendwo hinein.
- Türkische Ilahis legen ihren **lateinischen** Originaltext ins Feld `ar` und
  markieren das mit `latin: true`. Ein Feld namens `ar` enthält kein Arabisch.

**Lösung:** `verse_texts` mit `(lang, role, script)`:

| Fall | lang | role | script |
|---|---|---|---|
| Arabischer Originalvers | `ar` | `original` | `arab` |
| Umschrift davon | `ar` | `transliteration` | `latn` |
| Englische Übersetzung | `en` | `translation` | `latn` |
| Deutsche Übersetzung | `de` | `translation` | `latn` |
| Türkisches Ilahi (Original) | `tr` | `original` | `latn` |

Kein Flag, keine Ausnahme im Renderer. Die Anzeige entscheidet anhand von
`script`, welche Schriftstimme und welche Richtung gilt.

### 2.4 Sieben boolesche Felder, die in Wahrheit ein Typ sind

Ein Vers trägt heute bis zu sieben optionale Felder: `refrain`, `note`, `sep`,
`instruction`, `band`, `noRosette`, `shortPage`. Beobachtet man, wie sie benutzt
werden, sind drei davon ein **Typ** und vier sind **Zusatzangaben**:

| Alt | Neu | Warum |
|---|---|---|
| `refrain: true` | `verse_kind = 'refrain'` | schließt sich mit `instruction` gegenseitig aus |
| `instruction: true` | `verse_kind = 'instruction'` | dito |
| *(keins von beiden)* | `verse_kind = 'verse'` | |
| `band: "…"` | `band_label` | eine arabische Zwischenüberschrift **über** dem Vers |
| `note: "…"` | `note_label` | eine kleine Beschriftung, z. B. „Sūrat al-Ikhlāṣ" |
| `sep: "ﷺ"` | `separator` | ein Zeichen, das **hinter** dem Vers steht |
| `noRosette: true` | `no_rosette` | reine Darstellungsangabe |
| `shortPage: true` | `short_page` | Signal an die Höhenanpassung des Manuskripts |

> **Alternative, die verworfen wurde:** eine JSON-Spalte `flags`. Sie wäre
> flexibler, aber ein Admin-Formular kann keine JSON-Spalte prüfen, und
> `WHERE verse_kind = 'instruction'` ist mit einer echten Spalte indizierbar.
> Bei sieben bekannten Feldern ist Flexibilität kein Gewinn.

---

## 3 · Folios — die Manuskriptblätter

```js
folios: [
  { from: 0,   to: 128 },
  { from: 129, to: 133, band: "ابْتِدَاءُ الرُّبْعِ الثَّانِي" },
  { from: 134, to: 139 }
]
```

Ein Blatt ist ein **Versbereich**, kein eigener Text. Die Verse werden nicht
kopiert, sondern zugeschnitten.

Das ist eine echte fachliche Angabe, keine Layout-Bequemlichkeit: die Grenzen
folgen dem gedruckten Buch, dessen Seitenumbrüche eine Rezitationsstruktur
tragen. Deshalb ist `folios` eine eigene Tabelle mit Fremdschlüssel und keine
JSON-Spalte — sie ist redaktionell zu pflegen.

`has_sections` und `band_label` stammen aus den optionalen Feldern der Vorlage.

### Aber: `folios` ist nicht mehr der Hauptumbruch

Das ist wichtig und beim Lesen der Daten leicht zu übersehen.

Von **31** Werken mit Folio-Angaben haben **26 genau ein Folio**, das das ganze
Kapitel umfasst — also gar keine Unterteilung. Nur fünf sind wirklich mehrfach
geteilt.

Der tatsächliche Seitenumbruch steckt heute **im Verstext**: das Zeichen `‖`
(U+2016), **226 Mal** im Bestand. Die Manuskriptansicht teilt einen langen Vers
dort in Abschnitte und verteilt sie auf mehrere Blätter.

Daraus folgen zwei Dinge:

1. **`‖` ist Umbruchinformation ersten Ranges, keine Randnotiz.** Es wird vor
   der Anzeige entfernt (`stripBreaks()`), muss aber in `body` stehen bleiben.
   Geht es beim Import verloren, verliert die Buchansicht die Mehrzahl ihrer
   Seitengrenzen — und zwar lautlos: der Text erscheint weiterhin, nur auf
   weniger und volleren Blättern.
2. **Die Markierungsschlüssel haben deshalb eine Unterstufe.** `"d:7:129.1:2"`
   heißt: Vers 129, **zweiter Abschnitt** (nach dem `‖`), Segment 2. Wer die
   Positionsangaben migriert, muss das kennen.

> **Entwurfsentscheidung:** Der Umbruch bleibt zunächst im Text, weil er dort
> redaktionell gepflegt wird und die Darstellung ihn ohnehin zur Laufzeit
> auswertet. Ihn beim Import in eigene Zeilen aufzulösen wäre sauberer, würde
> aber die Verszählung gegenüber der Vorlage verschieben und damit jede
> vorhandene Positionsangabe entwerten. Falls das später gewünscht ist, ist es
> eine eigene Migration mit eigener Gegenprüfung.

### Wie viele Blätter daraus wirklich werden

Nachgerechnet: **46 Folio-Einträge werden zu 272 Blättern.** Eine
Versechsfachung, und sie entsteht ausschließlich durch das `‖`.

Ein Folio ist also **nicht** ein Blatt, sondern ein Bündel von Blättern. Wer die
Tabelle `folios` als „ein Datensatz je gedruckter Seite" liest, liegt um den
Faktor sechs daneben.

Zwei Regeln hängen daran und dürfen nicht verlorengehen:

**1 · Leere Abschnitte erzeugen kein Blatt.** Ein `‖` am Anfang, ein doppeltes
`‖`, oder eines, das ein Folio eröffnet, wird übersprungen. Sonst entstünden
leere Blätter.

**2 · Nur der letzte Abschnitt eines geteilten Verses bekommt die Rosette.**
Im Code heißt das Feld `cont` (*continues*): endet ein Abschnitt mitten im Vers,
wird der Versteiler unterdrückt und erscheint erst am tatsächlichen Versende auf
dem nächsten Blatt. Ohne diese Regel steht mitten in einem Satz eine Rosette,
die ein Versende behauptet, das keines ist.

Da der Umbruch im Text bleibt, bleiben auch diese Regeln in der Darstellung.
Sollte der Umbruch später in eigene Zeilen wandern, braucht `verse_segments`
zusätzlich ein `is_continuation`.

---

## 3a · Eine Darstellungsregel, die Daten werden muss

In der Buchansicht steht:

```js
const arDisplay = (kind === 'd' || kind === 'l')
  ? String(v.ar)                              // Dalāʾil und Litaneien: Kommas bleiben
  : String(v.ar).replace(/\s*،\s*/g, ' ');   // alle anderen: Kommas raus
```

Der Kommentar erklärt es: das Manuskript setzt keine Kommas, deshalb entfernt die
Buchansicht sie — *außer* bei den Dalāʾil und den Litaneien, „weil das lange,
ununterbrochene Litaneien sind und die Kommas das sind, was sie folgbar macht".

Das ist eine **redaktionelle Entscheidung je Sammlung**, die heute als
Buchstabenvergleich im Renderer steht. Ein neues Modul erbt sie stillschweigend
falsch. Sie gehört deshalb in die Datenbank:

```sql
ALTER TABLE collections
  ADD COLUMN book_keeps_commas TINYINT(1) NOT NULL DEFAULT 0;
```

Beim Import auf `1` für die Dalāʾil und die Aḥzāb, auf `0` für alles andere.

> Das ist ein Beispiel für ein Muster, das im ganzen Altcode wiederkehrt:
> **eine Fallunterscheidung über ein Kürzel ist fast immer eine fehlende
> Spalte.** Beim Übertragen lohnt es sich, auf `kind === '…'` zu grepen und jede
> Fundstelle zu fragen, ob dahinter Daten stecken.

---

## 4 · Zeichensatz und Kollation

```sql
DEFAULT CHARSET = utf8mb4
COLLATE         = utf8mb4_0900_ai_ci
```

**`utf8mb4` ist Pflicht, nicht Empfehlung.** Der Text enthält Zeichen außerhalb
der Basic Multilingual Plane und arabische Zeichen, die MySQLs altes `utf8`
(drei Byte) nicht speichern kann. Ein `utf8`-Feld verstümmelt die Daten still.

**`utf8mb4_0900_ai_ci`** (accent-insensitive, case-insensitive) ist für Titel
und Beschriftungen richtig: es findet „Būṣīrī" auch bei Eingabe von „Busiri".

**Aber nicht für arabische Originaltexte.** Bei Arabisch sind Diakritika keine
Akzente, sondern bedeutungstragend — `ai_ci` würde Verse gleichsetzen, die
unterschiedlich vokalisiert sind. Deshalb steht der Originaltext **unverändert**
in `body` und die Suche läuft ausschließlich über die eigene, normalisierte
Spalte `body_search`.

**Verbindliche Prüfliste beim Anlegen der Datenbank:**

```sql
CREATE DATABASE mawalid
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
```

Und in der Verbindungszeichenkette: `charset=utf8mb4`. Wer das vergisst, merkt
es an einem einzigen Fragezeichen mitten in einer Sure.

---

## 5 · Größenordnung

| Tabelle | Zeilen nach dem Import |
|---|---|
| `modules` | ~8 |
| `collections` | ~15 |
| `works` | ~111 |
| `verses` | ~2.512 |
| `verse_texts` | ~6.500 (ar + tr + en, nicht überall alle drei) |
| `folios` | ~40 |
| `media` | ~30 |

**Das ist winzig.** Die gesamte Datenbank passt in wenige Megabyte und
vollständig in den InnoDB-Buffer-Pool. Daraus folgt eine wichtige Konsequenz für
die Suche (§6): Optimierungen, die bei Millionen Zeilen nötig wären, sind hier
verfrühte Komplexität.

---

## 6 · Suche

### Die entscheidende Anforderung

Die heutige Suche ist **absichtlich unscharf**, und diese Unschärfe ist von Hand
kalibriert. Sie faltet:

- Alle arabischen Harakāt und Tatwīl weg
- `أ إ آ ٱ → ا`, `ى → ي`, `ؤ → و`, `ئ → ي`, `ة → ه`
- Lateinische kombinierende Zeichen (`ā ṣ ḥ ī ū ẓ ṭ`) über NFD weg
- Umschriftzeichen `ʿ ʾ` und Satzzeichen zu Leerzeichen
- Lautgleiches: `ph→f`, `ck→k`, `q→k`, `dh→d`, `th→t`, `gh→g`, `kh→h`,
  `sh→s`, `ee/ii/ea→i`, `oo/ou/uu→u`, `aa→a`, `y→i`, `w→u`
- Doppelbuchstaben zusammen: `rabbi → rabi`, `muhammad → muhamad`

Damit finden „Muhammad", „Muhamad", „Mohammed" und „محمد" alle dasselbe.

Und es gibt eine zweite Stufe, `tighten()`, die zusätzlich alle Leerzeichen
entfernt und **danach nochmals** Doppelbuchstaben zusammenzieht — weil das
Entfernen eines Leerzeichens erst eine Doppelung erzeugen kann
(`"ar rahman" → "arrahman" → "arahman"`).

Der eigentliche Vergleich ist ein **Vierfach-ODER**: normalisiert, gestrafft,
wörtlich kleingeschrieben, und bei arabischer Eingabe zusätzlich eine exakte
arabische Teilzeichenkette.

### Warum das nicht MySQL macht

Weder `FULLTEXT` noch eine Kollation bilden diese Regeln ab. Und würde man es
versuchen, verhielte sich die Suche anders als vorher — bei einem Werkzeug, mit
dem Menschen Verse suchen, die sie nur ungefähr im Ohr haben, ist das ein echter
Verlust.

### Die Lösung

**Die Normalisierung wird Zeichen für Zeichen aus der alten App übernommen**, in
`packages/shared/src/normalize.ts` gelegt und von **beiden** Seiten benutzt:

- Die API normalisiert beim Speichern und schreibt das Ergebnis nach
  `verse_texts.body_search`.
- Die API normalisiert die Suchanfrage genau gleich.
- Das Frontend benutzt dieselbe Funktion für lokale Vorfilterung.

Eine Funktion, zwei Aufrufer, kein Auseinanderlaufen.

### Eine Faltung für alle Sprachen — und warum nicht mehr

Es liegt nahe, die Faltung sprachabhängig zu machen: Die Regeln sind für
arabische Umschrift gebaut, und auf Deutsch angewandt sehen sie erst einmal
zerstörerisch aus.

| Eingabe | gefaltet |
|---|---|
| `Wissen` | `uisen` |
| `Wüste` | `uste` |
| `Schwester` | `schuester` |

**Das täuscht.** Die Faltung ist *selbstkonsistent*: Text und Anfrage laufen
durch dieselbe Funktion. Wer „Wissen" sucht, sucht nach `uisen`, und der Text
steht als `uisen` da — sie treffen sich. Was wirklich passiert, ist ein
**Präzisionsverlust**: `Wüste` und `Uste` fallen zusammen. Genau das ist bei
einer unscharfen Suche der Sinn der Sache; deshalb faltet die Vorlage ja
überhaupt `q→k`.

Eine Aufteilung nach Sprachen kostet dagegen etwas Echtes: **Treffer.** Die
englischen Übersetzungen stünden dann mild normalisiert da, und ein Tippfehler
fände sie nicht mehr.

```
Übersetzung „Muhammad"  →  arabisch gefaltet: muhamad   mild: muhammad
Anfrage     „muhamad"   →  arabisch gefaltet: muhamad   mild: muhamad
                                        trifft ✓                trifft ✗
```

Beim Aufbau der Prüfung ist genau das aufgetreten: mit sprachabhängiger
Normalisierung verloren `muhamad`, `qasida`, `kaseeda` und `qaseeda` Treffer,
die die alte App findet.

**Also: eine Faltung, für alle Sprachen, wie in der Vorlage.** `normalizeLatin()`
bleibt in `tools/lib/normalize.mjs` liegen, falls die Präzision auf deutschen
Wiki-Texten später doch stört — dann als *zweite* Spalte neben der ersten,
nicht als Ersatz.

### Titel gehören in die Suche

`work_translations` trägt neben `title` eine Spalte `title_search` in derselben
Normalisierung.

Ohne sie findet die Suche ein Werk nicht, dessen **Titel** den Begriff trägt,
dessen Verse aber nicht. Bei „Burdah" oder „Qasida" ist das der Regelfall — die
Prüfung hat drei solche Werke gemeldet, bevor die Spalte existierte. Die alte
App legt Titel und Verse in denselben Heuhaufen; das muss so bleiben.

Die Abfrage ist deshalb eine Vereinigung über beide:

```sql
SELECT ... FROM verse_texts WHERE body_search LIKE CONCAT('%', ?, '%')
UNION
SELECT ... FROM work_translations WHERE title_search LIKE CONCAT('%', ?, '%')
```

### Was die Suche zusätzlich liefern muss

Nicht nur „welches Werk", sondern **welche Zeile und welcher Abschnitt darin**.
Die App springt heute zu einem konkreten Vers und lässt ihn kurz aufblitzen.
Deshalb gibt die Suche pro Treffer zurück:

- `work_id`, `verse_id`
- `segment_index` — der wievielte durch `۞` oder `،` getrennte Abschnitt
- einen Textausschnitt mit Umgebung, Treffer markiert

Höchstens sechs Treffer je Werk, darunter „+N weitere Zeilen". Diese Deckelung
bleibt: sonst füllt ein häufiges Wort wie „Allah" die ganze Seite.

---

## 7 · Inhaltsversionen

Jede Sammlung hat `content_version BIGINT`, monoton steigend bei jeder Änderung
darin oder darunter.

Wozu, wenn wir online-first sind (ADR-004)?

1. **HTTP-Caching heute.** Der ETag einer Antwort ist die `content_version`.
   Ein `If-None-Match` beantwortet die API mit `304 Not Modified` — nichts
   wird übertragen.
2. **Offline morgen.** Ein Client kann fragen „hat sich seit Version N etwas
   geändert?" und nur bei Ja neu laden. Das ist die eine Vorkehrung, die einen
   späteren Offline-Cache von einem Neuentwurf zu einem abgegrenzten
   Arbeitspaket macht.

Erhöht wird sie im Anwendungscode nach jedem schreibenden Vorgang, nicht durch
einen Datenbanktrigger — die Grenze soll sichtbar im Code stehen, nicht in einem
Trigger, den beim Debuggen niemand vermutet.

---

## 8 · Persönliche Daten: Benutzer oder Gerät

`favorites`, `reading_positions` und `verse_marks` tragen **zwei** mögliche
Besitzer:

```sql
user_id   INT UNSIGNED NULL,
device_id INT UNSIGNED NULL,
CONSTRAINT ck_owner CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
```

Der Grund: Die App wird überwiegend ohne Anmeldung benutzt, und das soll so
bleiben. Wer sich nicht anmeldet, hat trotzdem Favoriten — sie hängen dann an
einer Geräte-ID, die der Client erzeugt.

**Vorrang:** Ist jemand angemeldet, gilt `user_id`. Beim Anmelden werden
Gerätedaten übernommen und die Gerätezeile dem Konto zugeordnet.

**Wichtig:** Diese Daten bleiben **zusätzlich** im `localStorage`. Sie sind
klein, sie gehören der Person, und sie sind das Einzige, was auch bei
ausgefallener API sofort da sein muss. Der Server ist hier eine Sicherungskopie,
keine Quelle der Wahrheit.

---

## 9 · Was die alten localStorage-Schlüssel werden

| Alt | Neu |
|---|---|
| `mawlid-favs` (`"kind\|titleEnglish"`) | `favorites` (Fremdschlüssel auf `works.id`) |
| `mawlid-dalail-place` (genau **ein** Eintrag) | `reading_positions`, **einer je Werk** |
| `mawlid-marks` (`"d:6:12:0"`) | `verse_marks` (`verse_id`, `segment_index`) |
| `mawlid-theme` | bleibt lokal — reine Anzeigeeinstellung |
| `mawlid-client-id` | `devices.public_id` |
| `mawlid-last-session`, `mawlid-venue-code` | bleiben lokal |
| `mawlid-play-rate`, `mawlid-spread`, `mawlid-reciter` | bleiben lokal, aber **zusätzlich** in einem Einstellungsobjekt am Konto |
| Cache `mawlid-audio` | bleibt Cache Storage |

> **Zwei Verbesserungen im Vorbeigehen:**
>
> Der Favoritenschlüssel enthält heute den **englischen Titel**. Wird ein Titel
> korrigiert, verwaist der Favorit stillschweigend — und `favItems()`
> überspringt ihn zwar, räumt ihn aber nie weg, sodass die Liste unbegrenzt
> wächst. Mit einem Fremdschlüssel kann das nicht passieren.
>
> Die Leseposition gibt es heute genau **einmal** für die ganze App und nur für
> die Dalāʾil. Je Werk eine ist offensichtlich besser: man kann in den Dalāʾil
> und in der Burdah gleichzeitig eine Stelle halten.

---

## 10 · Migrationen

Maßgeblich ist ab Phase 2 `apps/api/prisma/schema.prisma`. `db/schema.sql` ist
die lesbare Referenz und der Startpunkt.

```bash
npm run db:migrate        # prisma migrate dev — erzeugt eine Migrationsdatei
npm run db:studio         # Prisma Studio, zum Hineinschauen
npm run db:seed           # Import aus data/extracted/
```

**Regeln:**

1. Keine Änderung an der Datenbank ohne Migrationsdatei. Auch nicht „schnell
   von Hand" — die nächste Person hat dann ein anderes Schema als du.
2. Migrationen sind nach vorne gerichtet. Wer etwas rückgängig machen will,
   schreibt eine neue Migration.
3. Vor jeder Migration in Betrieb: `mysqldump`. Der Inhalt ist unersetzlich.
