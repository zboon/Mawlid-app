# @mawalid/shared

Die Form der API-Antworten — einmal, für beide Seiten.

## Wer was daraus nimmt

**Die API** importiert die Zod-Schemas und prüft damit in der Entwicklung, was
sie hinausgibt. Eine Abweichung fällt dort auf, wo sie entsteht — beim Bauen
der Antwort, nicht beim Anzeigen.

**Die Oberfläche** importiert ausschließlich `import type`. Zod landet dadurch
nicht im Bündel: eine zweite Prüfung von 2.512 Versen im Browser wäre
Rechenzeit ohne Erkenntnis. Die Roadmap-Forderung „Zod-Schemas, aus denen die
Frontend-Typen entstehen" ist trotzdem wörtlich erfüllt — die Typen entstehen
aus den Schemas (`z.infer`).

Begründung ausführlich: `docs/plan/decisions.md`, ADR-009.

## Einbindung

Kein Bauschritt, kein `dist/`. Beide Seiten binden die Quelle über einen
Pfad-Alias ein:

- `apps/api/tsconfig.json` → `paths`
- `apps/web/tsconfig.json` → `paths` **und** `apps/web/vite.config.ts` → `resolve.alias`

`zod` ist eine Peer-Abhängigkeit und liegt im Wurzelverzeichnis, damit dieses
Paket auch für sich typprüfbar bleibt.

## Die Regel, die man hier leicht bricht

**Kein `.trim()`, kein `.transform()` auf einem Textfeld.** Ein beschnittenes
Leerzeichen in vokalisiertem Arabisch fällt niemandem auf und ist trotzdem ein
Fehler. Die einzige erlaubte Ableitung eines Textes ist die Suchspalte, und die
steht in einer anderen Spalte der Datenbank.
