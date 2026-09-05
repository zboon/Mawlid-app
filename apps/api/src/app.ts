import Fastify from 'fastify'
import cors from '@fastify/cors'
import { ZodError } from 'zod'
import { corsOrigins, env } from './env.js'
import { HttpError, sendError } from './lib/errors.js'
import { contentRoutes } from './routes/content.js'
import { meRoutes } from './routes/me.js'

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

  /* PUT und DELETE für Zone 2; X-Device-Id muss der Preflight erlauben,
     sonst schluckt der Browser jede persönliche Anfrage kommentarlos. */
  app.register(cors, {
    origin: corsOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'If-None-Match', 'X-Device-Id'],
  })

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) return sendError(reply, err)

    /* Auch am Namen erkennen, nicht nur per instanceof: die Schemas aus
       @mawalid/shared bringen ihre eigene zod-Instanz mit, deren ZodError
       eine andere Klasse ist als die hiesige. */
    if (err instanceof ZodError || (err instanceof Error && err.name === 'ZodError')) {
      return sendError(
        reply,
        new HttpError(400, 'BAD_REQUEST', 'Die Anfrage passt nicht zum Schema.', (err as ZodError).issues),
      )
    }

    /* Fastifys eigene Klientenfehler (leerer JSON-Rumpf, kaputtes JSON, zu
       großer Rumpf …) tragen einen 4xx-Status. Der gehört durchgereicht —
       als 500 getarnt sähe der Client einen Serverfehler, wo er selbst die
       Anfrage reparieren müsste. */
    const status = (err as { statusCode?: unknown }).statusCode
    if (err instanceof Error && typeof status === 'number' && status >= 400 && status < 500) {
      const code = (err as { code?: unknown }).code
      return sendError(
        reply,
        new HttpError(status, typeof code === 'string' ? code : 'BAD_REQUEST', err.message),
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
  app.register(meRoutes, { prefix: '/api/me' })

  return app
}
