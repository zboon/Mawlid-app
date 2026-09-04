# Schriftlizenzen

Diese Dateien müssen mit den Schriften mitgeliefert werden. Sie zu entfernen
verletzt die Lizenzen.

| Datei | Schrift | Lizenz | Was erlaubt ist |
|---|---|---|---|
| `OFL.txt` | Amiri (400, 700) | SIL OFL 1.1 | Einbetten, weitergeben, ändern — **aber** eine geänderte Fassung darf nicht mehr „Amiri" heißen (Abschnitt 5, Reserved Font Name). Wer subsetzt, benennt die Familie um und passt **jede** `font-family`-Regel an, auch die `!important`-Regel der Rosette. |
| — | KFGQPC Uthmanic Script HAFS | frei nutzbar, **Änderung verboten** | Byte für Byte weitergeben. Kein Subsetting, keine Konvertierung nach WOFF2, keine Optimierung. |

## Warum die Uthmani-Datei nicht angefasst werden darf

Neben der Lizenz gibt es einen technischen Grund. Die Schrift bildet 171
Codepoints — das arabische Komma, den Strichpunkt, das Fragezeichen, den Punkt,
die Rosette ۞ und sämtliche persischen Buchstaben — auf ein leeres
Platzhalterglyph ab, das als **schwarzer Klotz** erscheint, nicht als nichts.

Deshalb trägt ihr `@font-face` eine handgeprüfte `unicode-range`, die nur die
Zeichen listet, die sie wirklich zeichnet. Alles andere fällt absichtlich auf
Amiri durch. Ein Build-Werkzeug, das Schriften automatisch verkleinert, bricht
beides auf einmal.

Details: `docs/design/02-typography.md`
