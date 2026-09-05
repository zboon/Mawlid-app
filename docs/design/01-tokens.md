# Design-Tokens

Alle Zahlen und Farben der App an einem Ort. Diese Datei ist die Quelle; die
Datei `src/styles/tokens.css` im Vue-Projekt ist ihre Umsetzung. Weichen beide
voneinander ab, ist die CSS-Datei falsch.

**Regel:** In Komponenten stehen nur Token-Namen. Kein `#123528`, kein
`rgba(250,245,234,.14)`, kein `.95rem`. Wenn ein Wert fehlt, wird er hier
eingetragen — nicht in der Komponente improvisiert.

---

## 1. Warum die Namen sich ändern

Die alten Namen beschreiben, wie eine Farbe *aussieht*: `--green`, `--paper`,
`--ms-paper`. Das ist genau so lange praktisch, bis jemand das Grün ändern will
oder ein drittes Thema dazukommt — dann heißt eine Variable `--green` und ist
blau.

Die neuen Namen beschreiben, wofür eine Farbe *da ist*: `--surface-card`,
`--ink-soft`, `--accent-line`. Die Manuskriptansicht ist dadurch kein zweiter
Satz Variablen mehr (`--ms-*`), sondern derselbe Satz mit anderen Werten.

Am Ende dieser Datei steht die vollständige Übersetzungstabelle alt → neu.

---

## 2. Farb-Primitive

Die rohen Werte. **Nicht direkt in Komponenten verwenden** — sie existieren nur,
damit die semantischen Tokens darauf verweisen können.

```css
:root {
  /* Grün */
  --c-green-900: #0B241B;
  --c-green-800: #0E2318;   /* dunkle Variante für Dunkelmodus-Chrome */
  --c-green-700: #123528;
  --c-green-600: #1B3A2C;
  --c-green-500: #1E5540;
  --c-green-400: #618B77;

  /* Gold */
  --c-gold-600:  #A98A55;
  --c-gold-500:  #B8934A;
  --c-gold-400:  #C9A55E;
  --c-gold-300:  #D8C193;

  /* Papier & Tinte */
  --c-paper-100: #FAF5EA;
  --c-paper-200: #FCF8EF;
  --c-paper-300: #EFE6D2;
  --c-paper-050: #ffffff;

  --c-ink-900:   #26281F;
  --c-ink-600:   #6B6A5C;
  --c-ink-100:   #ECE7D6;
  --c-ink-200:   #C7C3AF;
  --c-ink-050:   #F3ECD8;
  --c-ink-075:   #EFE7CF;

  /* Dunkelmodus-Flächen */
  --c-night-900: #12150E;
  --c-night-800: #191510;
  --c-night-700: #1E2318;
  --c-night-600: #232819;
  --c-night-500: #2E3324;

  /* Manuskript */
  --c-leaf-100:  #FBF4DE;
  --c-leaf-ink:  #2A2118;
  --c-leaf-ink-dark: #EADEC2;
  --c-leaf-rule: #6B4E2A;

  /* Ornament */
  --c-rosette:      #B23A2E;
  --c-rosette-dark: #D9705F;
  --c-band-teal:      #2E6B63;
  --c-band-teal-dark: #24504B;
  --c-band-terra:      #8C3B2F;
  --c-band-terra-dark: #6B2E26;
  --c-star-fill:        #BCD6E4;
  --c-star-fill-dark:   #7FA3B8;
  --c-star-stroke:      #CB8090;
  --c-star-stroke-dark: #D793A2;
}
```

---

## 3. Semantische Farb-Tokens

Diese werden in Komponenten benutzt. Jeder Token hat eine Hell- und eine
Dunkelfassung.

### 3.1 Marke (das Grün — Rahmung, Leisten, Chrome)

| Token | Hell | Dunkel | Wofür |
|---|---|---|---|
| `--brand` | `#123528` | `#1B3A2C` | Kopfleiste, Unterkopf, Leseleiste, Notizkarte |
| `--brand-deep` | `#0B241B` | `#0E2318` | Chrome **auf** Chrome: Tab-Leiste, Audio-Dock, Sitzungsbanner, Autoscroll-Leiste |
| `--brand-on` | `#FAF5EA` | `#FAF5EA` | **Der einzige erlaubte Vordergrund auf Marke.** Bleibt in beiden Themen hell — es ist Schriftfarbe, keine Fläche. |

> **Warum `--brand-on` im Dunkelmodus nicht kippt:** Die Kopfleiste ist auch im
> Dunkelmodus grün, nur dunkler. Elfenbein darauf bleibt richtig. Der alte Name
> `--paper` legte nahe, es sei eine Flächenfarbe — daher die Umbenennung.

### 3.2 Flächen (das Papier — Inhalt)

| Token | Hell | Dunkel | Wofür |
|---|---|---|---|
| `--surface-page` | `#FAF5EA` | `#12150E` | Seitengrund (`body`) |
| `--surface-card` | `#ffffff` | `#1E2318` | Jede Karte, Blase, Eingabe. Der Arbeitspferd-Token. |
| `--surface-card-alt` | `#FCF8EF` | `#232819` | Zweite Ebene, wärmer — abgesetzte Zeilen |
| `--surface-border` | `#EFE6D2` | `#2E3324` | Die 1px-Umrandung jeder Fläche |
| `--surface-press` | `#EFE6D2` | `#2E3324` | Füllung bei `:active`. Heute derselbe Wert wie `--surface-border`, aber ein eigener Name — sie werden auseinanderlaufen. |

### 3.3 Tinte (Text)

| Token | Hell | Dunkel | Wofür |
|---|---|---|---|
| `--ink` | `#26281F` | `#ECE7D6` | Fließtext, Überschriften |
| `--ink-soft` | `#6B6A5C` | `#C7C3AF` | Sekundärtext, Übersetzungszeile, Bildunterschriften |
| `--ink-accent` | `#1E5540` | `#618B77` | **Die einzige Art, Grün auf Papier zu setzen.** Abschnittstitel, Basmala, Links. |
| `--ink-arabic` | `#0B241B` | `#F3ECD8` | Arabischer Text in der Lese-Ansicht |
| `--ink-chip` | `#123528` | `#EFE7CF` | Beschriftung auf einem transparenten, goldumrandeten Chip |

> **Kontrastwarnung (aus dem Quelltext übernommen):** `--ink-accent` ist bewusst
> heller als `--brand`. Der Kommentar an der Originalstelle sagt: *„The header
> green itself is 1.5:1 here — invisible."* Wer `--brand` als Textfarbe auf
> `--surface-card` setzt, produziert im Dunkelmodus unlesbaren Text. Der Linter
> soll das melden.

### 3.4 Akzent (Gold)

| Token | Hell | Dunkel | Wofür |
|---|---|---|---|
| `--accent` | `#B8934A` | `#C9A55E` | Der Akzent: aktive Tabs, Zahlen, Lesezeichen, Zierlinien |
| `--accent-soft` | `#D8C193` | `#D8C193` | Blasse Akzentschrift auf Grün (Untertitel im Kopf) |
| `--accent-line` | `rgba(gold, .50)` | `rgba(gold, .50)` | Goldene Haarlinie **auf Grün** |
| `--accent-line-soft` | `rgba(gold, .30)` | `rgba(gold, .28)` | Dieselbe Linie, leiser, **auf Papier** |
| `--accent-wash` | `rgba(gold, .28)` | `rgba(gold, .26)` | Markierungs-Lasur über Text |

### 3.5 Durchscheinende Flächen auf Grün

Das sind die 43 `rgba()`-Literale, die außerhalb von `:root` verstreut liegen,
zusammengefasst. Sie haben nur 31 verschiedene Werte: fünf Stellen benutzen
denselben Wert, vier weitere denselben Aktivzustand — jetzt einmal benannt.

| Token | Wert | Wofür |
|---|---|---|
| `--on-brand-fill-subtle` | `rgb(from var(--brand-on) r g b / .08)` | Ruhender Tab |
| `--on-brand-fill` | `rgb(from var(--brand-on) r g b / .14)` | Runde Kopfleisten-Knöpfe, Sitzungs-Pille |
| `--on-brand-fill-active` | `rgb(from var(--brand-on) r g b / .28)` | Deren `:active`-Zustand |

> **Zweite Familie beseitigt:** Zwei Stellen (`.session-banner button`,
> `.autoscroll-bar button`) benutzten `rgba(243,236,216,.16)` — eine andere
> Basisfarbe für exakt dieselbe Aufgabe. Sie benutzen künftig `--on-brand-fill`.

### 3.6 Schatten-Tönung

| Token | Wert | Wofür |
|---|---|---|
| `--shadow-tint` | `rgb(from var(--brand) r g b / <a>)` | Schatten auf Papier |
| `--shadow-tint-deep` | `rgb(from var(--brand-deep) r g b / <a>)` | Schatten auf Manuskript und Chrome |

### 3.7 Ornament

| Token | Hell | Dunkel | Wofür |
|---|---|---|---|
| `--ornament-rosette` | `#B23A2E` | `#D9705F` | **Nur** die Rosette ۞. Kein Fehlerrot. |
| `--ornament-band-a` | `#2E6B63` | `#24504B` | Kopfband, Teil A (nur im SVG) |
| `--ornament-band-b` | `#8C3B2F` | `#6B2E26` | Kopfband, Teil B (nur im SVG) |
| `--ornament-star-fill` | `#BCD6E4` | `#7FA3B8` | Sternfüllung im Nahtband |
| `--ornament-star-stroke` | `#CB8090` | `#D793A2` | Sternkontur |
| `--ornament-rosette-petal` | = `--ornament-band-b` | = `--ornament-band-b` | Blütenblätter der Rosette (Inline-SVG) |
| `--ornament-rosette-line` | `#C9A55E` | `#B8934A` | Kontur und Mitte der Rosette |
| `--ornament-rosette-eye` | `#FBF4DE` | `#191510` | Das Auge in der Mitte |

**Die drei Rosetten-Tokens sind in Phase 3 dazugekommen.** Die Rosette ۞ wird
nicht als Zeichen gesetzt: die Textschrift bildet sie auf ein leeres
Platzhalterglyph ab (schwarzer Klotz), und die alte App wich deshalb auf ein
Hintergrundbild aus — als Daten-URI, der keine CSS-Variable lesen kann, also
**zweimal**, einmal je Thema. Als Inline-SVG-Komponente mit diesen Tokens ist
es ein Bild, das dem Thema folgt.

`--ornament-rosette-line` ist im hellen Thema **heller** als `--accent` und im
dunklen dunkler. Das ist kein Versehen, sondern der Wert aus der Vorlage.

> **Zu entscheiden:** Die drei Stern-Tokens sind in der alten App tot, weil das
> Sternenband **gar nicht gerendert wird** — die Konstante `STAR` (`app.js:1613`)
> ist definiert und wird nie benutzt. Entweder bewusst wiederbeleben (dann als
> Inline-SVG mit `currentColor` bzw. diesen Tokens, damit es dem Thema folgt)
> oder Tokens und Konstante streichen. Siehe `04-components.md`, Ornamente.

---

## 3.8 Die osmanische Palette und das Bereichs-Theming (Zayd-Entwurf)

Jeder Bereich der App trägt eine eigene Kachelfarbe aus einer Palette
osmanischer Buchmalerei. Sie färbt **zweierlei**: die Menükachel auf der
Startseite und das gesamte Chrom des Bereichs — Kopfleiste, Tableiste,
Leseleiste, Heute-Karte, Hinweis-Klappe, Docks.

| Schlüssel | Hell | Tief (hell) | Dunkel | Tief (dunkel) | Bereich |
|---|---|---|---|---|---|
| `green` | `#123528` | `#0B241B` | `#1B3A2C` | `#0E2318` | Mawlid (Markenfarbe) |
| `navy` | `#1B2A54` | `#101A38` | `#2A3D70` | `#16234A` | Dalāʾil, Al-Aḥzāb |
| `maroon` | `#6B1E2E` | `#4A121F` | `#7A2836` | `#551A24` | Silsila |
| `teal` | `#0F5C56` | `#0A3F3A` | `#166E66` | `#0E4F48` | Turuqs |
| `ochre` | `#8A5A20` | `#5E3C12` | `#9C6B2C` | `#6E4A1A` | Sohbets |
| `plum` | `#5A2450` | `#3C1836` | `#6E3064` | `#4A2044` | Ilahi |
| `rust` | `#8A3324` | `#5E2118` | `#9C4130` | `#6E2A1E` | Biographien |
| `indigo` | `#332B6B` | `#221D48` | `#433A82` | `#2C255C` | Osmanische Geschichte |
| `neutral` | `#6B6355` | `#4A4438` | `#7C7364` | `#564F42` | „Mehr in Kürze" |

**Wie der Mechanismus funktioniert.** Die Farbe steht als `theme_key` am
Modul (Datenbank), die Anwendung setzt sie als `data-theme` ans Wurzelelement.
`tokens.css` belegt darüber **nur** `--brand` und `--brand-deep` neu — alles
Chrom liest ohnehin diese beiden Namen und folgt von selbst, in beiden Themen.
Kein Bauteil kennt die Bereichsfarben; wer eine Kachel färbt, benutzt die
semantischen `--tile-*`-Namen.

Drei Regeln daran:

1. **`green` hat keinen `data-theme`-Block.** Grün ist die Voreinstellung von
   `--brand`; ein eigener Block müsste die Hell/Dunkel-Weiche duplizieren.
2. **Die `data-theme`-Blöcke stehen NACH `:root.dark`.** Gleiche Spezifität —
   die spätere Regel gewinnt, sonst bliebe das Chrom im Dunkelmodus grün.
3. **Gold, Tinte und Papier wechseln NICHT mit.** `--accent`, `--ink`,
   `--surface-*` bleiben in jedem Bereich gleich — die Bereiche unterscheiden
   sich in der Rahmenfarbe, nicht im Inhalt.

---

## 4. Das Manuskript-Thema

Die Buchansicht ist **kein zweiter Tokensatz**, sondern ein Block, der dieselben
semantischen Namen neu belegt. Alles darin schreibt weiterhin `--surface-card`
und `--ink` und funktioniert automatisch.

```css
.theme-manuscript {
  --surface-card:   #FBF4DE;   /* hell */
  --ink:            #2A2118;
  --ink-soft:       #6B4E2A;
  --surface-border: #6B4E2A;
  --accent:         #B8934A;
  --accent-wash:    rgb(from var(--accent) r g b / .28);
}
:root.dark .theme-manuscript {
  --surface-card:   #191510;
  --ink:            #EADEC2;
  --ink-soft:       #A98A55;
  --surface-border: #A98A55;
  --accent:         #C9A55E;
  --accent-wash:    rgb(from var(--accent) r g b / .26);
}
```

Der Doppelrahmen des Blattes bleibt eine Komponenteneigenschaft, kein Token —
siehe `04-components.md`.

> Anmerkung: `--ms-gold` und `--gold` hatten in beiden Themen **denselben Wert**.
> Die Trennung war also nie wirksam. Ein Token weniger.

---

## 5. Abstände

Die alte App benutzt **42 verschiedene Abstandswerte** in `padding`, `margin`
und `gap`. Das ist kein System, sondern gewachsener Zufall. Ersetzt durch zehn
Stufen, abgeleitet aus den tatsächlich dominierenden Werten:

```css
:root {
  --space-3xs: 0.1rem;    /*  1.6px  Abstand gestapelter Beschriftungen */
  --space-2xs: 0.2rem;    /*  3.2px  */
  --space-xs:  0.35rem;   /*  5.6px  kompakte Knopfabstände */
  --space-sm:  0.5rem;    /*    8px  Standard-Gap */
  --space-md:  0.7rem;    /* 11.2px  Zeilenpolsterung senkrecht */
  --space-lg:  0.95rem;   /* 15.2px  Zeilenpolsterung waagerecht */
  --space-xl:  1.1rem;    /* 17.6px  Seitenrand — der wichtigste Wert */
  --space-2xl: 1.4rem;    /* 22.4px  Kopfleistenrand */
  --space-3xl: 2.4rem;    /* 38.4px  */
  --space-4xl: 3rem;      /*   48px  Freiraum unter festen Leisten */
}
```

**Zwei zusammengesetzte Werte** kommen so oft wörtlich vor, dass sie eigene
Namen bekommen:

```css
--pad-row:      var(--space-md) var(--space-lg);    /* .7rem .95rem  — Listenzeile */
--pad-row-tall: 0.85rem var(--space-lg);            /* .85rem .95rem — hohe Zeile */
--pad-chip:     0.4rem 0.85rem;                     /* die Steuerpille des Lesers */
--pad-search-inset: 2.4rem;                         /* Innenabstand des Suchfelds zu Lupe und ✕ */
--accent-wash-strong: rgb(from var(--accent) r g b / 0.5);  /* die Lesezeichen-Lasur (placed) — kräftiger als --accent-wash */
```

`--pad-search-inset` (Phase 4) hält im Suchfeld den Text von Lupen-Symbol
und Löschknopf frei — die Vorlage nutzt 2,4/2,3 rem; ein Wert genügt.
`--pad-chip` ist in Phase 3 dazugekommen. Der Wert steht in `04-components.md`
§3 wörtlich vorgeschrieben; er gehört deshalb hierher und nicht in die
Komponente — sonst sähe ihn die Token-Prüfung nicht.

**Alles andere wurde auf die Skala gerundet.** Die Manuskript-Komponenten
brachten aus der Vorlage Werte wie `1.15rem`, `1.05rem` und `0.55rem` mit; der
Unterschied zur nächsten Stufe liegt unter einem Pixel und ist auf keinem
Bildschirm zu sehen. Zwei negative Werte des Kopfbandes sind exakte
Gegenstücke von Stufen und stehen als `calc(-1 * var(--space-sm))` da, nicht
als `-0.5rem`.

**Der Seitenrand** ist `--space-xl` (1,1 rem). Jeder Inhaltsbereich hält ihn ein:
Index, Verse, Abschnittseinleitung, Startraster, Sitzungsfeld. Neue Bereiche
ebenfalls.

**Sichere Bereiche.** Jede feste oder klebende Kante rechnet mit `env()`:

```css
padding-top: calc(env(safe-area-inset-top, 0px) + var(--space-md));
```

Das ist keine Kür — ohne das verschwindet die Kopfleiste unter der Notch.

---

## 6. Radien

Vierzehn Werte werden zu sieben:

```css
:root {
  --radius-pill:   999px;   /* Chips, Pillen, Leisten */
  --radius-circle: 50%;     /* runde Knöpfe, Zahlenblasen */
  --radius-lg:     16px;    /* Verse, große Karten */
  --radius-md:     14px;    /* Listenkarten, Startkacheln */
  --radius-sm:     12px;    /* Tabs, Eingabefelder */
  --radius-xs:     8px;     /* Rahmen, kleine Flächen */
  --radius-mark:   3px;     /* Textmarkierungen, Treffer */
  --radius-leaf:   2px;     /* die Manuskriptseite — fast eckig, mit Absicht */
}
```

Die Einzelfälle `10px` und `11px` fallen auf `--radius-sm`, `9px` auf
`--radius-xs`, `4px` auf `--radius-mark`.

---

## 7. Schatten

Zwanzig Definitionen werden zu sechs plus zwei Sonderfällen:

```css
:root {
  --shadow-xs: 0 1px 2px rgb(from var(--brand) r g b / .06);   /* Karte in Ruhe */
  --shadow-sm: 0 2px 8px  rgb(from var(--brand-deep) r g b / .25);
  --shadow-md: 0 2px 10px rgb(from var(--brand-deep) r g b / .28);
  --shadow-lg: 0 4px 16px rgb(from var(--brand-deep) r g b / .35);
  --shadow-xl: 0 6px 22px rgb(from var(--brand-deep) r g b / .30);
  --shadow-up: 0 -6px 22px rgb(0 0 0 / .32);                   /* Docks, von unten */
}
```

**Zwei Sonderfälle, die Tokens bleiben, weil sie Bedeutung tragen:**

```css
/* Der Doppel-Goldrahmen der Manuskriptseite — die Signatur des Designs. */
--shadow-leaf:
  0 0 0 3px   var(--surface-card) inset,
  0 0 0 4.5px var(--accent)       inset,
  0 3px 14px  rgb(from var(--brand-deep) r g b / .18);

/* Der Trefferblitz beim Springen zu einem Suchergebnis. */
--shadow-flash: 0 0 0 2px var(--accent), 0 0 16px rgb(from var(--accent) r g b / .55);
```

---

## 7a. Ein Pflichtfeld, das heute fehlt: `color-scheme`

Im alten Stylesheet steht **nirgends** `color-scheme`. Der Dunkelmodus ist reine
CSS-Kosmetik und erreicht die native Oberfläche des Browsers nicht: Scrollbalken,
Formularfelder, die Textauswahlfarbe und Datumsauswahlen bleiben hell, während
die Seite dunkel ist.

Zwei Zeilen beheben das:

```css
:root       { color-scheme: light; }
:root.dark  { color-scheme: dark;  }
```

Sie gehören direkt neben die Tokenblöcke, damit beim Umschalten nichts vergessen
wird.

---

## 8. Bewegung

```css
:root {
  --ease:          cubic-bezier(.2, .8, .3, 1);
  --duration-tap:  0.1s;    /* Druckreaktion */
  --duration-fast: 0.12s;   /* Farb-/Randwechsel */
  --duration-base: 0.24s;   /* Ein-/Ausklappen */
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Animiert werden ausschließlich `transform`, `opacity`, `background-color`,
`border-color`, `box-shadow`. Niemals `width`, `height`, `top`, `left` — das
erzwingt Layout-Neuberechnung mitten in der Rezitation.

---

## 9. Ebenen (z-index)

Eine Leiter, keine Zufallszahlen. Neue Ebenen werden hier eingetragen, nicht
lokal erfunden.

```css
:root {
  --z-base:      0;
  --z-sticky:   10;   /* Leseleiste */
  --z-nav:      40;   /* obere Leiste mit Tabs */
  --z-dock:     50;   /* Audio-Dock, Autoscroll-Leiste */
  --z-banner:   60;   /* Sitzungsbanner */
  --z-overlay:  80;   /* Blätter, Dialoge */
  --z-toast:    90;
}
```

---

## 10. Laufzeit-Tokens

Diese drei werden **vom Code zur Laufzeit gesetzt** und sind deshalb keine
Konstanten. Sie stehen trotzdem hier, weil ihre Wertebereiche verbindlich sind.

| Token | Standard | Bereich | Wer setzt ihn |
|---|---|---|---|
| `--ar-size` | `1.9rem` | ca. `1.3rem`–`3.2rem` | Schriftgrößenregler im Leser; wird beim Verlassen des Lesers auf den Standard zurückgesetzt |
| `--latin-scale` | `1` | `0.85`–`1.4` | derselbe Regler, für Umschrift und Übersetzung |
| `--player-h` | `0` | gemessene Höhe | Audio-Dock, damit der Inhalt darüber genug Freiraum behält |

> Ein vierter, `--ms-zoom`, wird vom Code geschrieben, aber von keiner
> CSS-Regel gelesen — toter Code. Im Neuaufbau entweder anschließen oder
> entfernen.

---

## 11. Übersetzungstabelle alt → neu

| Alt | Neu | Anmerkung |
|---|---|---|
| `--green` | `--brand` | |
| `--green-deep` | `--brand-deep` | |
| `--paper` | `--brand-on` | Vordergrund auf Grün, keine Fläche |
| `--bg` | `--surface-page` | |
| `--card` | `--surface-card` | |
| `--card-alt` | `--surface-card-alt` | |
| `--paper-edge` | `--surface-border` / `--surface-press` | in zwei Rollen aufgeteilt |
| `--ink` | `--ink` | unverändert |
| `--ink-soft` | `--ink-soft` | unverändert |
| `--accent-green` | `--ink-accent` | |
| `--chip-ink` | `--ink-chip` | |
| `--ar-color` | `--ink-arabic` | |
| `--gold` | `--accent` | |
| `--gold-soft` | `--accent-soft` | |
| `--rule` | `--accent-line` | |
| `--rule-soft` | `--accent-line-soft` | |
| `--ms-mark` | `--accent-wash` | |
| `--ms-paper` | `--surface-card` im `.theme-manuscript` | |
| `--ms-ink` | `--ink` im `.theme-manuscript` | |
| `--ms-rule` | `--ink-soft` / `--surface-border` im `.theme-manuscript` | |
| `--ms-gold` | `--accent` | wertgleich, entfällt |
| `--ms-rosette` | `--ornament-rosette` | |
| `--ms-band-a/b` | `--ornament-band-a/b` | |
| `--star-fill` | `--ornament-star-fill` | heute tot |
| `--band-field` | entfällt | wertgleich mit `--brand-deep` |
| `--star-stroke` | `--ornament-star-stroke` | heute tot |
| `--ar-size` | `--ar-size` | unverändert |
| `--latin-scale` | `--latin-scale` | unverändert |
| `--player-h` | `--player-h` | nach `:root` verschoben |
| `--ms-zoom` | entfällt oder wird angeschlossen | tot |

---

## 12. Browser-Anforderung

Die Alpha-Ableitungen oben benutzen die **relative Farbsyntax**
(`rgb(from var(--x) r g b / .14)`). Sie ist in Chrome 119+, Safari 16.4+ und
Firefox 128+ verfügbar — das deckt die Zielgeräte ab.

Falls ältere Browser unterstützt werden müssen, werden die Alpha-Varianten
stattdessen im Build erzeugt (Sass-Funktion oder PostCSS-Plugin) und als fertige
Literale ausgeliefert. Die Token-Namen bleiben in beiden Fällen identisch — das
ist der Punkt an benannten Tokens.
