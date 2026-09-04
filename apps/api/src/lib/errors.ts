/* Ein Fehlerformat für die ganze API — docs/architecture/04-backend-api.md. */

import type { FastifyReply } from 'fastify'

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: unknown = null,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export const notFound = (code: string, message: string) => new HttpError(404, code, message)

/* 404 statt 403 für Unveröffentlichtes: ein 403 verriete, dass es das Ding
   gibt. Deshalb hat der Server dafür keinen eigenen Zweig. */

export const conflict = (code: string, message: string, details: unknown = null) =>
  new HttpError(409, code, message, details)

export const badRequest = (code: string, message: string, details: unknown = null) =>
  new HttpError(400, code, message, details)

export function sendError(reply: FastifyReply, err: HttpError) {
  return reply
    .code(err.status)
    .send({ error: { code: err.code, message: err.message, details: err.details } })
}
