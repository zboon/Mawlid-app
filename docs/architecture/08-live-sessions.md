# Live-Sitzungen

Die Funktion, mit der eine Versammlung dem folgt, der vorne rezitiert.

Sie ist deutlich mehr als „alle springen zum selben Text": die Seiten der
Folgenden **gleiten mit** der Seite der führenden Person, Bild für Bild. Das ist
der Unterschied zwischen „ich sehe seine Sprünge" und „ich sehe seinen
Bildschirm" — und es ist die Eigenschaft, die beim Umbau am leichtesten verloren
geht.

---

## 1 · Was heute existiert

Rund 1.000 Zeilen, vollständig im Client, auf **Supabase Realtime Broadcast** —
kein Datenbanktisch, keine Anmeldung, keine Präsenzliste. Die Bibliothek wird
erst beim ersten Tippen auf „Start" oder „Beitreten" von jsDelivr nachgeladen,
sodass ein Start ohne Netz nie darauf wartet.

Es ist ein von Hand gebautes verteiltes Konsensverfahren.

### Die Führung („das Mikrofon")

| Baustein | Was er tut |
|---|---|
| **`term`** | Ein monoton steigender Zähler. Jede Nachricht trägt ihn; alles mit älterem `term` wird verworfen. Das ist es, was ein Telefon, das kurz weg war und dann zurückkommt, daran hindert, die Versammlung zu übernehmen. |
| **Probe/`where`** | Beim Beitreten fragt ein Gerät in den Raum: „Führt hier jemand?" |
| **`PROBE_MS = 5200`** | So lange wird auf eine Antwort gewartet, bevor der Raum als leer gilt. **Der Wert wurde von 2800 heraufgesetzt**, damit die Probe einen vollen Netzwerk-Zeitausfall überdauert. |
| **`BEAT_MS = 4000`** | Herzschlag der führenden Person |
| **`BEAT_LOST_MS = 14000`** | So lange warten Folgende, bevor das Mikrofon frei wird |
| **`LEADER_PENDING_MS = 9000`** | So lange wird noch zugehört, bevor selbst übernommen wird |
| **Anspruchs-Gleichstand** | Melden mehrere gleichzeitig Anspruch an, gewinnt die kleinste Client-ID — allen Geräten liegt dieselbe Regel vor, also kommen alle zum selben Ergebnis |

Diese Zahlen sind **empirisch gefunden**, nicht gewählt. Der Kommentar an
`PROBE_MS` sagt, welchen Fehler die Erhöhung behoben hat. Wer sie beim Umbau
neu würfelt, holt sich denselben Fehler zurück.

### Die Positionsspiegelung

| Baustein | Was er tut |
|---|---|
| **`SPOT_MS = 80`** | Die führende Person schickt ihre Position bis zu zwölf Mal je Sekunde. *Der Kommentar hält fest: war erst 900, dann 120.* |
| **`spotStep()`** | Bei den Folgenden läuft eine Animationsschleife, die sich der zuletzt empfangenen Position **annähert** — 34 % des Abstands je Bild — statt darauf zu springen. Zwischen zwei Nachrichten gleitet die Seite weiter. |
| **Große Sprünge sofort** | Ist der Abstand größer als 90 % der Bildschirmhöhe (Blattwechsel, Tippen auf eine ferne Zeile), wird er in einem Schritt genommen. Nur normales Lesetempo wird geglättet. |
| **`spotExpectedY`** | Gespeichert wird, wohin gescrollt werden *sollte*, nicht was `scrollY` danach sagt. Safari aktualisiert `scrollY` asynchron — läse man ihn zurück, hielte man den eigenen Scroll für ein Eingreifen der lesenden Person und gäbe die Verfolgung auf. |

Das ist der Kern der Funktion, und es ist der Teil, der beim Neubau am ehesten
zu einer Diashow verkommt.

### Beitreten und Übergabe

- Vierstelliger Code **oder** Link `…/#s=4821`. Das Fragment wird von Browsern
  nie an einen Server geschickt — ein geteilter Link verrät dem Hoster nichts.
- Wer selbst etwas öffnet, übernimmt. Ein „Zurück in den Takt"-Knopf im Banner
  bringt zurück in Gleichschritt.
- Spät Beitretende springen sofort an die aktuelle Stelle.
- Das Banner zeigt: führend, folgend oder pausiert.

### Was im Quelltext steht

`SESSION_CONFIG` ist **befüllt** — eine echte Projekt-URL und ein echter
anonymer Schlüssel sind eingecheckt. Die Funktion ist also aktiv, obwohl das
README sie als „off by default" beschreibt. Beim anonymen Schlüssel ist das
vorgesehen; er ist zur Veröffentlichung gedacht. Trotzdem gehört er in die
Konfiguration.

---

## 2 · Was ersetzt werden muss — und warum

**Nicht weil Supabase schlecht wäre.** Zwei Dinge passen nicht mehr:

**1 · `{kind, idx, verse}` ist kein stabiler Bezeichner.** Jede Nachricht
adressiert Inhalt als Buchstabenkürzel plus **Array-Index**. Genau das hört auf
zu stimmen, sobald Inhalte in der Datenbank liegen und redigierbar sind. Fügt
jemand ein Kapitel ein, zeigen die Folgenden auf den falschen Text — ohne
Fehlermeldung.

**2 · Es gibt jetzt einen eigenen Server.** Und der kann etwas, was der Client
nicht kann: **maßgeblich sein.** Die rund 350 Zeilen Führungswahl —
`term`-Zähler, Probe, Herzschlag, Gleichstandsregel — existieren nur, weil kein
Server da ist, der sagen könnte, wer führt. Mit einem Server entfallen sie
ersatzlos.

---

## 3 · Der Ersatz

**WebSocket am eigenen Fastify-Server** (`@fastify/websocket`), **server-maßgeblich**.

### Warum WebSocket

| Verfahren | Bewertung |
|---|---|
| **WebSocket** | ✅ Beidseitig, geringe Verzögerung, trägt zwölf Positionsnachrichten je Sekunde ohne Aufwand |
| Server-Sent Events | Nur eine Richtung — die führende Person bräuchte POSTs für jede Positionsmeldung. Bei `SPOT_MS = 80` sind das zwölf HTTP-Anfragen je Sekunde |
| Polling | Verzögerung von Sekunden. Das Gleiten wäre weg |
| Supabase behalten | Zweite Netzabhängigkeit, zweites Konto, und die Führungswahl bliebe im Client |

Bei einer Versammlung mit typischerweise unter dreißig Geräten ist die Last
vernachlässigbar.

### Der Server hält den Zustand

```
{ sessionId, leaderDeviceId, term, currentRef, updatedAt }
```

Damit entfällt die gesamte Konsensschicht. Ein Anspruch ist eine Nachricht an
den Server; der Server entscheidet, erhöht `term` und teilt es allen mit. Kein
Probe-Handschlag, kein Gleichstand, keine Regel, die auf jedem Gerät zum selben
Ergebnis kommen muss.

### Das Protokoll

```jsonc
// Client → Server: ich führe und bin hier   (bis zu 12×/s)
{ "type": "position",
  "module": "dalail", "collection": "wochenteile", "work": "dienstag",
  "verseId": 8842, "frac": 0.37, "view": "book" }

// Server → alle Folgenden
{ "type": "position", "…": "…", "term": 7, "at": 1712345678901 }

// Client → Server: ich nehme das Mikrofon
{ "type": "claim" }

// Server → alle: so ist es entschieden
{ "type": "leader", "device": "<uuid>", "term": 8 }
```

**Zwei Dinge, die man nicht weglassen darf:**

1. **`frac`** — die Position *innerhalb* des Verses, als Bruchteil. Ohne sie
   springt die Anzeige zeilenweise statt zu gleiten.
2. **Slugs und `verseId` statt Array-Index.** `"work": "dienstag"` bleibt
   gültig, egal wie die Datenbank sortiert.

### Das Gleiten muss mitkommen

`spotStep()` wird ein Composable und behält **alle drei** Eigenschaften:

- Annäherung mit 34 % je Bild statt Sprung
- Abstände über 90 % Bildschirmhöhe in einem Schritt
- **Gespeichert wird das gewünschte Ziel, nicht der zurückgelesene `scrollY`** —
  sonst hält Safari die eigene Bewegung für ein Eingreifen und bricht ab

Diese drei Punkte sind der Unterschied zwischen der Funktion und einer
Diashow.

---

## 4 · Ausfälle

| Was passiert | Was die App tut |
|---|---|
| Verbindung bricht ab | Wiederverbinden mit wachsenden Abständen (1 s, 2 s, 4 s … max 30 s). Banner: „Verbindung getrennt" |
| Server nicht erreichbar | Sitzung endet. Der Rest der App ist unberührt |
| Code existiert nicht | **„Diese Sitzung gibt es nicht"** — und das ist eine Verbesserung: bei Supabase Broadcast entstehen Kanäle bei Bedarf, ein falscher Code legt also stillschweigend einen leeren Privatraum an, in dem man ewig auf jemanden wartet |
| Führende Person geht | Der Server merkt es am ausbleibenden Herzschlag und gibt das Mikrofon frei |

**Der Grundsatz aus der alten App bleibt:** Die Live-Sitzung ist ein Zusatz.
Fällt sie aus, ist alles andere unverändert benutzbar. Nichts anderes in der App
darf davon abhängen.

---

## 5 · Sicherheit und Privatsphäre

### Bleibt

- Der Code steht weiterhin im **Fragment** (`#s=…`), damit ein geteilter Link
  dem Hoster nichts verrät.
- Keine Anmeldung nötig. Eine Versammlung soll beitreten können, ohne Konten
  anzulegen.

### Kommt hinzu

**Der Beitrittsschlüssel wird vom Anzeigecode getrennt.** Heute ist der
vierstellige Code beides: er wird laut gesagt *und* er ist der einzige Schutz.
Vier Ziffern sind zehntausend Möglichkeiten — in Minuten durchprobiert, und wer
drin ist, kann `takeLead()` aufrufen, weil nur geprüft wird, ob der Kanal
existiert.

Künftig:

- **Link-Beitritt** über ein unerratbares Token (~128 Bit) im Fragment
- **Gesprochener Code** vierstellig, aber nur innerhalb eines Ortes eindeutig
  und ratenbegrenzt
- **Das Mikrofon zu übernehmen** braucht Teilnahme an der Sitzung, nicht nur
  Kenntnis des Kanalnamens

Dazu:

- Ratenbegrenzung beim Anlegen von Sitzungen (drei je Gerät und Stunde) — sonst
  lässt sich der Vorrat vierstelliger Codes erschöpfen
- Der Server prüft, dass ein Slug existiert und veröffentlicht ist, bevor er ihn
  weiterleitet
- Nachrichtengröße und -rate begrenzt

### Was gespeichert wird

**Nur der aktuelle Zeiger.** Kein Verlauf. Es gibt nichts nachzulesen, und ein
Verlauf wäre eine Aufzeichnung darüber, wer wann gebetet hat.

Positionsdaten (zwölf Nachrichten je Sekunde) gehen **niemals** in die
Datenbank — sie leben im Speicher des Servers und sind mit der Sitzung vorbei.

Keine IP-Adressen, auch nicht in Sitzungen.

---

## 6 · Fehler in der heutigen Umsetzung, die nicht mitwandern

| | |
|---|---|
| **Client-Leck** | `connectSession()` ruft bei jedem Aufruf `createClient()` und `channel()` und räumt den vorherigen nie ab. Nur `leaveSession()` räumt auf. Wiederholtes Verbinden sammelt Verbindungen an. |
| **Falscher Code ohne Fehlermeldung** | Siehe oben: Broadcast legt den Kanal einfach an. |
| **Mikrofon ohne Nachweis** | `takeLead()` prüft nur, ob ein Kanal existiert. |

---

## 7 · Übergang

Alte und neue App können **nicht** an derselben Sitzung teilnehmen — die alte
verschickt `{kind, idx}`, die neue Slugs, und die Indizes stimmen nach der
Migration nicht mehr überein.

Das ist kein Problem, muss aber klar sein:

- Wer eine Sitzung führt, sagt vorher, welche App gilt.
- Sinnvoll ist ein Schnitt: alle wechseln gleichzeitig.
- Bis dahin bleibt die alte App mit Supabase in Betrieb.

Eine Brücke wäre baubar (eine Zuordnung Index → Slug für die Übergangszeit),
lohnt aber bei einer Handvoll Geräten nicht.
