import Fastify from 'fastify'
import cors from '@fastify/cors'
import { ZodError } from 'zod'
import { corsOrigins, env } from './env.js'
import { HttpError, sendError } from './lib/errors.js'
import { contentRoutes } from './routes/content.js'

export function buildApp() {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? { level: 'info', transport: undefined }
        : { level: 'warn' },
    /* Kürzel sind laut Schema bis zu 160 Zeichen lang; Fastifys Vorgabe von
       100 würde sie stillschweigend abschneiden und einen 404 erzeugen. */
    routerOptions: { maxParamLength: 512 },
  })

  app.register(cors, { origin: corsOrigins, methods: ['GET', 'HEAD'] })

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) return sendError(reply, err)

    if (err instanceof ZodError) {
      return sendError(
        reply,
        new HttpError(400, 'BAD_REQUEST', 'Die Anfrage passt nicht zum Schema.', err.issues),
      )
    }

    /* Alles Übrige ist unser Fehler. Er wird geloggt; nach außen geht nur,
       dass er passiert ist — ein Stapelabzug verrät Pfade und Spaltennamen. */
    req.log.error({ err }, 'Unbehandelter Fehler')
    return sendError(
      reply,
      new HttpError(500, 'INTERNAL', 'Unerwarteter Fehler. Er steht im Serverprotokoll.'),
    )
  })

  app.setNotFoundHandler((_req, reply) =>
    sendError(reply, new HttpError(404, 'ROUTE_NOT_FOUND', 'Diesen Endpunkt gibt es nicht.')),
  )

  app.get('/health', async () => ({ ok: true }))

  app.register(contentRoutes, { prefix: '/api/content' })

  return app
}
