/* Zwischenspeicherung und Ausgabeprüfung — für jede Inhaltsantwort dieselbe. */

import { createHash } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { z } from 'zod'
import { env } from '../env.js'

/* Der ETag hat drei Teile: Bereich, `content_version` und ein kurzer Abdruck
 * des Rumpfes — `"work-dienstag-42-Ux7f2Kd9a1"`.
 *
 * Warum beides? Die Roadmap verlangt den ETag aus `content_version`, und das
 * ist der Teil, der später den Offline-Abgleich trägt (ADR-004). Nur trägt
 * `content_version` heute die Sammlung, nicht das Modul: eine umbenannte
 * Modulüberschrift ließe den Zähler unberührt, und der Client behielte eine
 * veraltete Antwort. Der Abdruck schließt diese Lücke, ohne dass man sich auf
 * Zähler verlassen muss, die noch niemand erhöht.
 *
 * Der Preis: der Server baut die Antwort auch dann, wenn er sie nicht sendet.
 * Gespart wird die Übertragung, nicht die Abfrage. Auf einem Telefon ist genau
 * das der Engpass.
 */
export function cachedJson<T>(
  req: FastifyRequest,
  reply: FastifyReply,
  opts: {
    scope: string
    version: number
    body: T
    schema?: z.ZodType<T>
    maxAge?: number
  },
) {
  /* Die Ausgabeprüfung läuft nur in der Entwicklung. Sie fängt Fehler in der
     Abbildung Datenbank → Antwort, und die fallen dort auf, wo sie entstehen.
     Im Betrieb wäre sie nur Rechenzeit für ein Ergebnis, das schon feststeht. */
  if (opts.schema && env.NODE_ENV === 'development') {
    const check = opts.schema.safeParse(opts.body)
    if (!check.success) {
      req.log.error({ issues: check.error.issues }, `Antwort verletzt ihr Schema: ${opts.scope}`)
    }
  }

  const json = JSON.stringify(opts.body)
  const digest = createHash('sha1').update(json).digest('base64url').slice(0, 10)
  const etag = `"${opts.scope}-${opts.version}-${digest}"`

  reply.header('ETag', etag)
  reply.header(
    'Cache-Control',
    `public, max-age=${opts.maxAge ?? 60}, stale-while-revalidate=600`,
  )

  if (matchesEtag(req.headers['if-none-match'], etag)) {
    return reply.code(304).send()
  }
  return reply.type('application/json; charset=utf-8').send(json)
}

/* `If-None-Match` darf eine Liste sein, jeder Eintrag darf schwach sein
   (`W/"…"`), und `*` trifft immer. */
function matchesEtag(header: string | string[] | undefined, etag: string): boolean {
  if (!header) return false
  const raw = Array.isArray(header) ? header.join(',') : header
  if (raw.trim() === '*') return true
  return raw
    .split(',')
    .map((s) => s.trim().replace(/^W\//, ''))
    .includes(etag)
}
