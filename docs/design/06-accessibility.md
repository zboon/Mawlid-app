# Zugänglichkeit

Die App wird beim Rezitieren benutzt — oft im Halbdunkel, oft von älteren
Menschen, oft mit dem Telefon in einer Hand. Zugänglichkeit ist hier keine
Formalität.

Dieses Kapitel benennt auch offen, wo die heutige App Lücken hat. Sie zu
übernehmen wäre die einfachste und falscheste Entscheidung.

---

## 1 · Was die alte App schon richtig macht

Damit es nicht verloren geht:

- **Die Kontrastkommentare im Stylesheet.** An `--accent-green` steht
  ausdrücklich: *„this also colours the ~19px section titles, which need 4.5:1.
  The header green itself is 1.5:1 here — invisible."* Und an `--ink-soft`:
  *„brightened: was #A3A08E, too dim for the translation line"*. Da hat jemand
  gemessen, nicht geschätzt.
- **Der Aus-Zustand von Chips wechselt die Farbe, nicht nur die Deckkraft.**
  Der Kommentar sagt warum: Deckkraft allein war auf Dunkel unlesbar.
- **`@media (prefers-reduced-motion: reduce)`** ist vorhanden.
- **Hover-Zustände hinter `@media (hover: hover)`**, damit sie auf Touch nicht
  kleben bleiben.
- **Der Segmentschalter** trägt `role="group"` und ein `aria-label`.
- **Die Schriftgröße ist einstellbar** — arabisch und lateinisch getrennt. Das
  ist mehr, als die meisten Apps anbieten.
- **`-webkit-text-size-adjust: 100%`** verhindert das willkürliche Vergrößern
  durch iOS.

---

## 2 · Was fehlt und ergänzt werden muss

### 🔴 `color-scheme` fehlt — der Dunkelmodus bleibt an der Seite stehen

Im ganzen Stylesheet steht kein `color-scheme`. Der Dunkelmodus ist dadurch
reine CSS-Kosmetik und erreicht die native Oberfläche nicht: Scrollbalken,
Formularfelder, die Textauswahlfarbe und Datumsauswahlen bleiben hell, während
die Seite dunkel ist.

```css
:root      { color-scheme: light; }
:root.dark { color-scheme: dark;  }
```

Zwei Zeilen. Sie gehören neben die Tokenblöcke.

### 🔴 Fokuszustände — die größte Lücke

Die heutige App hat **keinen einzigen `:focus`- oder `:focus-visible`-Zustand**.
Das gesamte Bedienmodell ist `:active` und `.on` für Touch.

Damit ist die App per Tastatur praktisch unbedienbar: man sieht nicht, wo man
ist.

**Verbindlich für jedes bedienbare Element:**

```css
:where(button, a, input, [tabindex]):focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: inherit;
}
/* Auf Grün braucht der Ring die helle Farbe, sonst verschwindet er. */
:where(.masthead, .reader-bar, .tabbar) :focus-visible {
  outline-color: var(--brand-on);
}
```

`:focus-visible` statt `:focus` — dann erscheint der Ring bei Tastaturbedienung
und nicht bei jedem Fingertipp.

### 🔴 Sinnvolle Bedienelemente statt `<button>` mit Symbol

Viele Knöpfe enthalten nur ein SVG. Ein Screenreader liest dann nichts.

```vue
<button class="icon-btn" :aria-label="t('reader.bookmark')" :aria-pressed="isFav">
  <BookmarkIcon aria-hidden="true" />
</button>
```

- `aria-label` an jedem Knopf ohne sichtbaren Text
- `aria-pressed` an jedem Umschalter (Favorit, Umschrift, Übersetzung)
- `aria-hidden="true"` an jedem dekorativen SVG
- Ornamente (Rosette, Sternenband, Kopfband) sind **immer** `aria-hidden`

### 🟠 Sprachauszeichnung

Arabischer Text muss als solcher ausgezeichnet sein, sonst liest ein
Screenreader ihn mit englischer Aussprache vor:

```html
<p class="v-ar" lang="ar" dir="rtl">…</p>
<p class="v-tr" lang="ar-Latn">…</p>   <!-- Umschrift -->
<p class="v-en" lang="en">…</p>
<p class="v-de" lang="de">…</p>
```

Das gilt auch für die zweisprachigen Beschriftungen: der arabische Teil bekommt
`lang="ar"`.

### 🟠 Landmarks und Überschriftenhierarchie

Die alte App rendert alles in ein `<div id="app">`. Der neue Aufbau benutzt
echte Landmarks:

```html
<header>   Kopfleiste
<nav>      Tab-Leiste
<main>     Inhalt
<footer>   Fußzeile
```

Und eine saubere Überschriftenfolge: eine `<h1>` je Seite (der Titel des Werkes
oder des Bereichs), darunter `<h2>` für Abschnitte. Keine Sprünge.

### 🟠 Zum Inhalt springen

```html
<a class="skip-link" href="#main">Zum Inhalt springen</a>
```

Sichtbar bei Fokus. In einem Text mit 213 Versen erspart das eine Menge
Tab-Drücke.

### 🟠 Statusmeldungen

Wenn eine Suche Ergebnisse liefert oder ein Favorit gesetzt wird, muss das
angesagt werden:

```html
<div role="status" aria-live="polite" class="visually-hidden">
  {{ resultCount }} Treffer
</div>
```

---

## 3 · Kontrast

**Verbindliche Mindestwerte** (WCAG 2.2 AA):

| Inhalt | Mindestens |
|---|---|
| Fließtext | 4,5:1 |
| Text ab 24 px oder 19 px fett | 3:1 |
| Bedienelemente, Ränder, Symbole | 3:1 |

**Zu prüfen sind immer beide Themen.** Der häufigste Fehler in dieser App wäre,
`--brand` als Textfarbe auf `--surface-card` zu setzen — im Dunkelmodus sind
das 1,5:1.

**Prüfliste je neuem Farbpaar:**

- [ ] Hell geprüft
- [ ] Dunkel geprüft
- [ ] Bei Text auf Grün: `--brand-on` benutzt, nichts anderes
- [ ] Bei Grün auf Papier: `--ink-accent` benutzt, nicht `--brand`

Automatisch prüfbar: ein kleines Skript über `tokens.css`, das alle definierten
Paare durchrechnet, läuft in CI.

---

## 4 · Tippziele

**Mindestens 44 × 44 px**, auch wenn das sichtbare Element kleiner ist.

Die heutigen Kopfleistenknöpfe sind 2,3 rem ≈ 37 px — zu klein. Lösung, ohne
das Aussehen zu ändern:

```css
.icon-btn {
  width: 2.3rem; height: 2.3rem;   /* sichtbare Größe bleibt */
  position: relative;
}
.icon-btn::after {                  /* unsichtbare Vergrößerung des Ziels */
  content: '';
  position: absolute;
  inset: -4px;
}
```

Betroffen sind auch: die Löschtaste im Suchfeld, das Vers-Lesezeichen
(sehr klein und mit Deckkraft 0,35), die Punkte der Blattnavigation.

---

## 5 · Tastatur

| Taste | Wirkung |
|---|---|
| `Tab` / `Shift+Tab` | Weiter, zurück |
| `Enter` / `Leertaste` | Auslösen |
| `Escape` | Vollbild verlassen, Blatt schließen, Suche leeren |
| `←` / `→` | Blatt wechseln in der Buchansicht |
| `/` | In das Suchfeld springen |

**Fokusfalle vermeiden:** Der Vollbildmodus blendet alles außer dem Text aus.
Der Fokus darf dann nicht auf ein unsichtbares Element wandern — ausgeblendete
Bereiche bekommen `inert` oder `display: none`, nicht nur `opacity: 0`.

---

## 6 · Bewegung

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Der Autoscroll ist davon ausgenommen** — er wurde ausdrücklich angefordert und
ist der Zweck der Schaltfläche. Aber:

- Er startet **nie** von selbst
- Der Stopp-Knopf ist jederzeit erreichbar
- Er hält am Dokumentende an

Der **Trefferblitz** beim Springen zu einem Suchergebnis wird bei reduzierter
Bewegung durch einen ruhenden Rahmen ersetzt, nicht ersatzlos gestrichen — sonst
weiß man nicht, wo man gelandet ist.

---

## 7 · Sehschwäche und Vergrößerung

- **Bis 200 % Zoom** darf nichts abgeschnitten werden und nichts waagerecht
  scrollen (außer der Manuskriptansicht, die das absichtlich tut).
- **Alle Größen in `rem`**, nie in `px` für Text. Dann wirkt die
  Browsereinstellung.
- **Die Schriftgrößenregler** sind ein eigenständiger Weg und bleiben. Sie sind
  für arabischen Text wichtiger als der Browserzoom, weil sie nur den Vers
  vergrößern und nicht die Bedienelemente.

---

## 8 · Prüfliste vor jedem Merge

- [ ] Jedes bedienbare Element hat einen sichtbaren Fokusring
- [ ] Jeder Symbolknopf hat ein `aria-label`
- [ ] Jeder Umschalter hat `aria-pressed` oder `aria-checked`
- [ ] Jedes dekorative SVG hat `aria-hidden="true"`
- [ ] Arabischer Text hat `lang="ar"` und `dir="rtl"`
- [ ] Kontrast in **beiden** Themen geprüft
- [ ] Tippziele mindestens 44 px
- [ ] Nur mit der Tastatur bedienbar, ohne Falle
- [ ] Mit reduzierter Bewegung geprüft
- [ ] Bei 200 % Zoom kein Abschneiden

**Automatisch in CI:** `axe-core` in den Playwright-Tests, plus die
Kontrastprüfung über `tokens.css`. Das fängt die Hälfte ab; die andere Hälfte
findet nur, wer die Tastatur benutzt.
