import { buildApp } from './app.js'
import { env } from './env.js'
import { prisma } from './lib/prisma.js'

const app = buildApp()

async function main() {
  /* Einmal anfassen, bevor der Port aufgeht. Eine falsche DATABASE_URL soll
     beim Start auffallen und nicht beim ersten Leser. */
  await prisma.$queryRaw`SELECT 1`
  await app.listen({ port: env.PORT, host: env.HOST })
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void (async () => {
      await app.close()
      await prisma.$disconnect()
      process.exit(0)
    })()
  })
}

main().catch(async (err) => {
  app.log.error({ err }, 'Start fehlgeschlagen')
  await prisma.$disconnect()
  process.exit(1)
})
