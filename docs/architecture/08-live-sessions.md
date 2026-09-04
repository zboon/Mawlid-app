# Live-Sitzungen

Die Funktion, mit der eine Versammlung dem folgt, der vorne rezitiert: öffnet
die führende Person einen Text, springen alle verbundenen Geräte mit.

---

## 1 · Wie es heute läuft

Über **Supabase Realtime Broadcast** — die einzige Netzfunktion der alten App.

- Die Supabase-Bibliothek wird erst geladen, wenn jemand „Start" oder „Beitreten"
  drückt. Ein Start ohne Netz wartet also nie darauf.
- Kanalname ist ein vierstelliger Code.
- Beitreten geht über den Code **oder** über einen Link `…/#s=4821`.
- Der Code steht im **Fragment** der URL. Fragmente werden von Browsern nie an
  Server geschickt — das Teilen eines Links verrät dem Hoster also nichts.
- Es gibt keine Anmeldung und keine Datenbanktabellen. Broadcast leitet nur
  weiter und speichert nichts.
- Übertragen wird `{kind, idx}` — **das Kürzel der Textart und der Array-Index**.
- Wer selbst etwas öffnet, übernimmt die Führung. Ein „Zurück in den Takt"-Knopf
  im Banner bringt einen wieder in Gleichschritt.
- Wer spät beitritt, springt sofort an die aktuelle Stelle.
- Ein Banner zeigt: führend, folgend oder pausiert.

Zugangsdaten (Projekt-URL und anonymer Schlüssel) stehen **im Quelltext**. Beim
anonymen Schlüssel ist das vorgesehen — er ist zur Veröffentlichung gedacht.

---

## 2 · Was daran ersetzt werden muss

**Nicht weil Supabase schlecht wäre**, sondern weil zwei Dinge nicht mehr passen:

1. **`{kind, idx}` ist kein stabiler Bezeichner.** Der Array-Index verschwindet
   bei der Migration. Nach dem Umbau zeigt derselbe Index auf einen anderen Text.
2. **Es gibt jetzt einen eigenen Server.** Eine zweite Netzabhängigkeit für eine
   Funktion, die der eigene Server ohne Weiteres kann, ist unnötig.

---

## 3 · Der Ersatz

**WebSocket am eigenen Fastify-Server** (`@fastify/websocket`).

```
Client  ──ws──▶  /ws/session/:code
```

### Warum WebSocket und nicht SSE oder Polling

| Verfahren | Bewertung |
|---|---|
| **WebSocket** | ✅ Beidseitig, geringe Verzögerung, ein Verbindungstyp für Führen und Folgen |
| Server-Sent Events | Nur eine Richtung — die führende Person bräuchte zusätzlich POSTs. Zwei Wege für eine Sache |
| Polling | Verzögerung von Sekunden. Bei einer Versammlung, die gemeinsam rezitiert, unbrauchbar |
| Supabase behalten | Zusätzliche Abhängigkeit, zusätzliches Konto, zusätzlicher Ausfallpunkt |

Bei einer Versammlung mit typischerweise unter dreißig Geräten ist die Last
vernachlässigbar.

---

## 4 · Das Protokoll

### Sitzung starten

```
POST /api/sessions            { deviceId }
  → { code: "4821", sessionId: "uuid", expiresAt }
```

Ein vierstelliger Code, der unter den **aktiven** Sitzungen eindeutig ist. Bei
Kollision neu würfeln.

### Beitreten

```
GET /ws/session/4821?device=<uuid>
```

Beim Verbinden schickt der Server sofort den aktuellen Stand — damit springt
auch, wer spät kommt, an die richtige Stelle.

### Nachrichten

```jsonc
// Server → alle, wenn die führende Person die Stelle wechselt
{ "type": "goto",
  "work": "dienstag", "collection": "wochenteile", "module": "dalail",
  "verse": 42, "segment": 1, "view": "book",
  "leader": "<deviceId>", "at": 1712345678901 }

// Client → Server, wenn ich führe
{ "type": "position", "work": "dienstag", "verse": 42, "segment": 1, "view": "book" }

// Client → Server, wenn ich die Führung übernehme
{ "type": "claim", "device": "<uuid>" }

// Server → alle
{ "type": "leader", "device": "<uuid>" }

// beidseitig, alle 30 s
{ "type": "ping" }
```

**Der entscheidende Unterschied zu heute:** verschickt werden **Slugs**, keine
Array-Indizes. `"work": "dienstag"` bleibt gültig, egal wie sich die Datenbank
sortiert.

### Führungswechsel

Wer selbst etwas öffnet, während er folgt, sendet `claim` und wird zur führenden
Person. Bei gleichzeitigen Ansprüchen entscheidet der Server nach Ankunft — und
teilt allen mit, wer es geworden ist.

Wer nicht mehr führt, sieht im Banner „Zurück in den Takt" und ist mit einem
Tippen wieder dabei.

### Zustand

Nur der **aktuelle Zeiger** steht in `live_sessions`. Kein Verlauf — es gibt
nichts nachzulesen, und ein Verlauf wäre eine Aufzeichnung dessen, wer wann
gebetet hat.

Sitzungen verfallen nach vier Stunden Untätigkeit. Ein Aufräumlauf löscht
abgelaufene.

---

## 5 · Ausfälle

| Was passiert | Was die App tut |
|---|---|
| Verbindung bricht ab | Wiederverbinden mit wachsenden Abständen (1 s, 2 s, 4 s … max 30 s). Das Banner zeigt „Verbindung getrennt" |
| Server nicht erreichbar | Sitzung endet. Der Rest der App ist unberührt |
| Code existiert nicht | „Diese Sitzung gibt es nicht mehr" |
| Führende Person geht | Nach 60 s ohne Lebenszeichen wird die Sitzung führerlos; wer als Erster etwas öffnet, übernimmt |

**Der Grundsatz aus der alten App bleibt:** Die Live-Sitzung ist ein Zusatz.
Fällt sie aus, ist alles andere unverändert benutzbar. Nichts anderes in der App
darf davon abhängen.

---

## 6 · Sicherheit und Privatsphäre

**Was bleibt:**

- Der Code steht weiterhin im **Fragment** (`#s=4821`), damit ein geteilter Link
  dem Hoster nichts verrät.
- Keine Anmeldung nötig. Eine Versammlung soll beitreten können, ohne Konten
  anzulegen.

**Was hinzukommt, weil es jetzt einen eigenen Server gibt:**

- Ratenbegrenzung beim Erstellen von Sitzungen (drei je Gerät und Stunde) —
  sonst kann jemand den Vorrat an vierstelligen Codes erschöpfen.
- Nachrichtengröße begrenzt, Nachrichtenrate begrenzt.
- Der Server prüft, dass ein Slug existiert und veröffentlicht ist, bevor er ihn
  weiterleitet. Ein Beitretender bekommt nur Verweise auf Dinge, die er ohnehin
  öffnen darf.
- IP-Adressen werden nicht gespeichert, auch nicht in Sitzungen.

**Was wegfällt:**

- Die Supabase-Zugangsdaten verschwinden aus dem Quelltext. Auch wenn der
  anonyme Schlüssel zur Veröffentlichung gedacht ist: er gehört in die
  Konfiguration, nicht in eine Datei, die jemand kopiert und weiterverwendet.

---

## 7 · Übergang

Alte und neue App können **nicht** an derselben Sitzung teilnehmen — die alte
verschickt `{kind, idx}`, die neue Slugs, und die Indizes stimmen nach der
Migration nicht mehr überein.

Das ist kein Problem, aber es muss klar sein:

- Wer eine Sitzung führt, muss allen sagen, welche App gilt.
- Sinnvoll ist ein Schnitt: alle wechseln gleichzeitig.
- Bis dahin bleibt die alte App mit Supabase in Betrieb.

Eine Brücke zwischen beiden Formaten wäre baubar (eine Zuordnung Index → Slug
für die Übergangszeit), lohnt aber bei einer Handvoll Nutzern nicht.
