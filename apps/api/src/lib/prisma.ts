import { PrismaClient } from '@prisma/client'
import { env } from '../env.js'

/* Ein Client für den ganzen Prozess. Bei `tsx watch` würde jeder Neustart des
   Moduls sonst einen weiteren Verbindungspool öffnen, bis MySQL die
   Verbindungen verweigert — deshalb der Umweg über globalThis. */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (env.NODE_ENV === 'development') globalForPrisma.prisma = prisma

/* MySQL zählt in BIGINT. `JSON.stringify` kann BigInt nicht und wirft dabei
   einen TypeError, der wie ein Serverfehler aussieht. Alle Zahlen, die hier
   vorkommen — Versnummern, Zählungen, content_version — passen mühelos in
   eine JavaScript-Zahl. */
export const num = (v: bigint | number | null | undefined): number =>
  v === null || v === undefined ? 0 : typeof v === 'bigint' ? Number(v) : v
