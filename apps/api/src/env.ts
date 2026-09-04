/* Konfiguration an einer Stelle, beim Start geprüft.
   Ein fehlendes DATABASE_URL soll den Server sofort anhalten und nicht erst
   beim ersten Aufruf einen 500er erzeugen. */

import { z } from 'zod'

const Schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('127.0.0.1'),
  DATABASE_URL: z.string().min(1),
  /* Woher die Oberfläche kommt. Mehrere durch Komma getrennt.
     Beide Schreibweisen stehen in der Vorgabe, weil `localhost` und
     `127.0.0.1` für den Browser VERSCHIEDENE Herkünfte sind: wer die App
     über die eine öffnet und die API auf die andere eingestellt hat, sieht
     eine leere Seite und im Serverprotokoll nicht den geringsten Hinweis. */
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173,http://127.0.0.1:5173'),
})

const parsed = Schema.safeParse(process.env)

if (!parsed.success) {
  const fields = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')
  /* Der Pfad steht ausgeschrieben da, weil die Vorlage im Wurzelverzeichnis
     liegt, die Datei aber HIER erwartet wird — und weil `.env` nicht im
     Repository ist. Nach dem Klonen ist das der erste Stolperstein. */
  console.error(
    [
      'Konfiguration unvollständig:',
      fields,
      '',
      'Es fehlt die Datei  apps/api/.env  — sie liegt absichtlich nicht im',
      'Repository. Einmal anlegen:',
      '',
      '    cp .env.example apps/api/.env      (Windows: copy .env.example apps\\api\\.env)',
      '',
      'und darin DATABASE_URL auf die eigene Datenbank zeigen lassen.',
    ].join('\n'),
  )
  process.exit(1)
}

export const env = parsed.data

export const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((s) => s.trim())
  .filter(Boolean)
