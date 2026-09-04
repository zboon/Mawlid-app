/* Konfiguration an einer Stelle, beim Start geprüft.
   Ein fehlendes DATABASE_URL soll den Server sofort anhalten und nicht erst
   beim ersten Aufruf einen 500er erzeugen. */

import { z } from 'zod'

const Schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('127.0.0.1'),
  DATABASE_URL: z.string().min(1),
  /* Woher die Oberfläche kommt. Mehrere durch Komma getrennt. */
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
})

const parsed = Schema.safeParse(process.env)

if (!parsed.success) {
  const fields = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')
  console.error(`Konfiguration unvollständig:\n${fields}\n\nVorlage: .env.example`)
  process.exit(1)
}

export const env = parsed.data

export const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((s) => s.trim())
  .filter(Boolean)
