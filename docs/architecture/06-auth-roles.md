# Anmeldung und Rollen

Wer darf was, und wie wird das durchgesetzt.

---

## 1 · Der Grundsatz

**Lesen braucht keine Anmeldung.** Die App ist ein Gebetsbuch; wer sie öffnet,
soll lesen können. Anonym, ohne Konto, ohne Zustimmungsbanner.

Die Anmeldung existiert für genau zwei Dinge:

1. **Redaktion** — Inhalte pflegen
2. **Synchronisierung** — Favoriten und Lesepositionen über Geräte hinweg

---

## 2 · Die vier Rollen

| Rolle | Lesen | Übersetzungen | Arabischer Text | Struktur | Veröffentlichen | Benutzer |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `reader` | ✅ | — | — | — | — | — |
| `contributor` | ✅ | Entwurf | — | — | — | — |
| `editor` | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Warum `contributor` den arabischen Text nicht ändern darf:** Ein Tippfehler in
der Vokalisierung ändert die Rezitation. Übersetzungen sind reparierbar, ein
falsches Harakat wird jahrelang mitgelesen. Wer arabischen Text ändern soll,
bekommt `editor`.

Der Standard beim Anlegen ist `reader`. Das Hochstufen ist eine bewusste
Handlung eines `admin`.

---

## 3 · Wie die Anmeldung funktioniert

**Session-Cookies, keine JWTs.**

```
POST /api/admin/auth/login  { email, password }
  → argon2id-Vergleich
  → Sitzungszeile in auth_sessions
  → Set-Cookie: sid=<zufällig>; HttpOnly; SameSite=Strict; Secure; Max-Age=…
```

**Warum keine JWTs:** Ein JWT lässt sich nicht widerrufen. Bei einer Anwendung,
in der ein `editor` heruntergestuft werden kann, ist eine Sitzung, die in der
Datenbank steht und dort gelöscht werden kann, schlicht richtig. Der
angebliche Vorteil (Zustandslosigkeit) hilft nur bei horizontaler Skalierung,
die hier nicht ansteht.

**Im Cookie steht nur eine Zufallszahl.** In der Datenbank liegt ihr
SHA-256-Abdruck, nicht der Wert selbst — wer die Datenbank liest, kann sich
damit nicht anmelden.

**Passwörter:** `argon2id`, Parameter nach OWASP-Empfehlung
(64 MiB, 3 Durchläufe, Parallelität 4). Kein bcrypt, kein SHA irgendwas.

**Bremse:** Nach fünf Fehlversuchen aus derselben Quelle innerhalb von
15 Minuten wird verzögert und danach gesperrt. Die Fehlermeldung ist immer
dieselbe — „E-Mail oder Passwort falsch" — damit sie nicht verrät, welche
Adressen existieren.

---

## 4 · Durchsetzung

**An einer Stelle, nicht in jedem Endpunkt.**

```ts
// Die Zone /api/admin/* trägt die Prüfung als Plugin.
app.register(async (admin) => {
  admin.addHook('preHandler', requireRole('contributor'))

  admin.get('/works', listWorks)
  admin.post('/works', { preHandler: requireRole('editor') }, createWork)
  admin.patch('/users/:id/role', { preHandler: requireRole('admin') }, setRole)
})
```

Die Grundprüfung gilt für die ganze Zone; einzelne Endpunkte verschärfen sie.
Ein neu hinzugefügter Endpunkt ist dadurch **standardmäßig geschützt** — der
häufigste Sicherheitsfehler ist der vergessene Wächter, und diese Anordnung
macht ihn unmöglich.

### Feldweise Rechte

Manche Regeln gelten nicht für einen ganzen Endpunkt, sondern für ein Feld:

```ts
// Ein contributor darf einen Vers speichern — aber nicht das Original.
if (user.role === 'contributor') {
  const forbidden = input.texts.filter(t => t.role === 'original')
  if (forbidden.length) throw forbidden403('Originaltext erfordert die Rolle editor')
}
```

Solche Regeln stehen im Service, nicht im Endpunkt, und haben einen Test.

---

## 5 · Entwurf und Veröffentlichung

Jede redigierbare Tabelle hat `status`:

```
draft → review → published
```

- **`/api/content/*` liefert ausschließlich `published`.** Ohne Ausnahme, ohne
  Parameter, ohne „aber für Admins".
- **`/api/admin/*` liefert alles** — mit `status` im Ergebnis.
- Der Übergang nach `published` ist ein eigener Endpunkt und braucht `editor`.

Eine Vorschau für Unveröffentlichtes läuft über die Admin-Zone mit einem
Vorschaufenster, nicht über einen Parameter an der öffentlichen Zone. Sonst ist
irgendwann `?preview=1` das Loch, durch das alles sichtbar wird.

---

## 6 · Versionierung und Protokoll

**Vor jeder Änderung** wird der bisherige Zustand als JSON nach
`content_revisions` geschrieben. Bei diesem Datenvolumen kostet das nichts und
rettet einen falsch angefassten arabischen Text.

```ts
await withRevision('verse_text', id, user, 'Übersetzung überarbeitet', async () => {
  await prisma.verseText.update({ where: { id }, data })
})
```

Der Wrapper macht alles: Momentaufnahme, Änderung, `content_version` erhöhen,
`audit_log` schreiben — in einer Transaktion.

**Wiederherstellen** ist ein eigener Endpunkt und selbst wieder eine
versionierte Änderung. Es gibt keinen Zustand, den man nicht zurückholen kann.

**Das Protokoll** hält fest, wer wann was getan hat: Anmeldungen,
Rollenänderungen, Veröffentlichungen, Löschungen. Es wird nicht gelöscht.

---

## 7 · Anonyme Geräte

Wer sich nicht anmeldet, hat trotzdem Favoriten und Lesepositionen.

```
X-Device-Id: <uuid, vom Client erzeugt>
```

Die ID ist zufällig, wird nur lokal erzeugt und identifiziert keine Person. Sie
landet in `devices.public_id`.

**Beim Anmelden** werden die Gerätedaten dem Konto zugeschlagen und das Gerät
mit `user_id` verknüpft. Bei Doppelungen gewinnt der neuere Zeitstempel; bei
Favoriten wird vereinigt.

**Datenschutz:** Diese Daten sind personenbezogen, sobald ein Konto dranhängt.
Deshalb:

- IP-Adressen werden nur gehasht gespeichert, in `auth_sessions`
- Es gibt einen Endpunkt zum Löschen des eigenen Kontos samt aller
  persönlichen Daten
- Es gibt einen Endpunkt zum Export der eigenen Daten
- Kein Tracking, keine Analytik, keine Drittanbieter-Skripte

---

## 8 · Erster Zugang

Es gibt **kein** eingebautes Standardpasswort. Der erste Admin wird über ein
Kommando angelegt:

```bash
npm run user:create -- --email you@example.com --role admin
# fragt das Passwort interaktiv ab, echot es nicht
```

Kein Registrierungsformular. Neue Konten legt ein `admin` an oder lädt per
E-Mail-Link ein.

---

## 9 · Was fehlt und wann es nötig wird

| Fehlt | Wann es gebraucht wird |
|---|---|
| Zwei-Faktor-Authentisierung | Sobald die App öffentlich erreichbar ist |
| E-Mail-Bestätigung | Sobald sich jemand selbst registrieren kann |
| Passwort-zurücksetzen | Sobald es mehr als eine Handvoll Konten gibt |
| CSRF-Token | Bei `SameSite=Strict` und einer eigenen Domain nicht nötig; **sofort** nötig, wenn ein Formular über eine andere Herkunft abgeschickt wird |
| Rechte je Modul | Wenn eine Person nur die Sohbets pflegen soll, nicht die Dalāʾil |

Solange die App lokal läuft (ADR-006), ist keiner dieser Punkte dringend. Sie
werden hier festgehalten, damit sie bei einer Veröffentlichung nicht vergessen
werden — das ist der Moment, in dem sie alle auf einmal fällig werden.
