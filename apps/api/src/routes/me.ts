/* Zone 2 · Persönlich.
 *
 * Favoriten, Lesepositionen, Markierungen, Anzeigeeinstellungen — die Daten,
 * die heute im localStorage des Telefons liegen. Sie bleiben auch dort: der
 * Client rendert aus seinem Spiegel und gleicht im Hintergrund ab. Diese
 * Zone ist die Sicherung, die das Gerät überdauert, nicht der Renderpfad.
 *
 * Besitzer ist in Phase 4 immer ein GERÄT: der Client erzeugt beim ersten
 * Start eine UUID und schickt sie als X-Device-Id mit (04-backend-api.md,
 * „Ohne Anmeldung"). Konten kommen in Phase 5 dazu; die Tabellen tragen
 * beides schon (user_id ODER device_id).
 *
 * Nichts hier wird gecacht: die Antworten sind klein, gehören einer Person
 * und wären mit ETag-Logik nur ein zweiter Ort, an dem Zustand veralten kann.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  DisplaySettingsInput,
  FavoriteInput,
  MeState,
  PositionInput,
  type DisplaySettings,
  type FavoriteEntry,
  type MarkEntry,
  type PositionEntry,
} from '@mawalid/shared'
import { num, prisma } from '../lib/prisma.js'
import { localized } from '../lib/localized.js'
import { badRequest, notFound } from '../lib/errors.js'
import { env } from '../env.js'

/* Die Geräte-ID ist eine v4-UUID aus crypto.randomUUID() des Clients. Alles
   andere wird abgewiesen, bevor es eine Datenbankzeile wird — die Spalte ist
   CHAR(36), und ein freier String wäre eine Einladung, sie als Nachricht zu
   missbrauchen. */
const DEVICE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function requireDevice(req: FastifyRequest): Promise<{ id: number; publicId: string }> {
  const header = req.headers['x-device-id']
  const publicId = Array.isArray(header) ? header[0] : header
  if (!publicId || !DEVICE_RE.test(publicId)) {
    throw badRequest('DEVICE_REQUIRED', 'X-Device-Id fehlt oder ist keine UUID.')
  }
  const row = await prisma.devices.upsert({
    where: { public_id: publicId.toLowerCase() },
    update: { last_seen_at: new Date() },
    create: { public_id: publicId.toLowerCase(), last_seen_at: new Date() },
    select: { id: true, public_id: true },
  })
  return { id: row.id, publicId: row.public_id }
}

/* Ein Werk über Sammlung + Kürzel — das Paar ist eindeutig (uq_works_slug),
   das Kürzel allein nicht. Deshalb tragen die Pfade beide Teile. */
async function resolveWork(collectionSlug: string, workSlug: string) {
  const work = await prisma.works.findFirst({
    where: {
      slug: workSlug,
      status: 'published',
      collections: { slug: collectionSlug, is_published: true, modules: { is_published: true } },
    },
    select: { id: true },
  })
  if (!work) {
    throw notFound('WORK_NOT_FOUND', `Kein veröffentlichtes Werk ${collectionSlug}/${workSlug}.`)
  }
  return work
}

const WorkParams = z.object({ collection: z.string().min(1), work: z.string().min(1) })
const MarkParams = z.object({
  verseId: z.coerce.number().int().positive(),
  segmentIndex: z.coerce.number().int().min(0).max(999),
})
const CollectionQuery = z.object({ collection: z.string().min(1) })

function personal<T>(reply: FastifyReply, body: T, schema?: z.ZodType<T>) {
  if (schema && env.NODE_ENV === 'development') {
    const check = schema.safeParse(body)
    if (!check.success) {
      reply.log.error({ issues: check.error.issues }, 'Antwort verletzt ihr Schema: me')
    }
  }
  reply.header('Cache-Control', 'no-store')
  return reply.send(body)
}

export async function meRoutes(app: FastifyInstance) {
  /* Der ganze persönliche Zustand in einer Antwort — der Start der App
     kommt mit einem Abgleich aus. */
  app.get('/', async (req, reply) => {
    const device = await requireDevice(req)

    const workInclude = {
      work_translations: true,
      collections: { select: { slug: true, modules: { select: { slug: true } } } },
    } as const

    const [favRows, posRows, markRows, settingsRow] = await Promise.all([
      prisma.favorites.findMany({
        where: { device_id: device.id },
        orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
        include: { works: { include: workInclude } },
      }),
      prisma.reading_positions.findMany({
        where: { device_id: device.id },
        include: {
          works: { include: workInclude },
          verses: { select: { position: true } },
        },
      }),
      prisma.verse_marks.findMany({ where: { device_id: device.id } }),
      prisma.display_settings.findUnique({ where: { device_id: device.id } }),
    ])

    const favorites: FavoriteEntry[] = favRows.map((f) => ({
      module: f.works.collections.modules.slug,
      collection: f.works.collections.slug,
      work: f.works.slug,
      titles: localized(f.works.work_translations, 'title'),
      hasFolios: f.works.has_folios,
      sortOrder: f.sort_order,
    }))

    const positions: PositionEntry[] = posRows.map((p) => ({
      module: p.works.collections.modules.slug,
      collection: p.works.collections.slug,
      work: p.works.slug,
      titles: localized(p.works.work_translations, 'title'),
      verseId: p.verse_id === null ? null : num(p.verse_id),
      position: p.verses?.position ?? null,
      segmentIndex: p.segment_index,
      viewMode: p.view_mode,
      updatedAt: p.updated_at.toISOString(),
    }))

    const marks: MarkEntry[] = markRows.map((m) => ({
      verseId: num(m.verse_id),
      segmentIndex: m.segment_index,
    }))

    const settings: DisplaySettings | null = settingsRow
      ? {
          viewMode: settingsRow.view_mode,
          arScale: settingsRow.ar_scale === null ? null : Number(settingsRow.ar_scale),
          latinScale: settingsRow.latin_scale === null ? null : Number(settingsRow.latin_scale),
          showTransliteration: settingsRow.show_transliteration,
          showTranslation: settingsRow.show_translation,
          twoPages: settingsRow.two_pages,
          scrollSpeedIdx: settingsRow.scroll_speed_idx,
        }
      : null

    return personal(
      reply,
      { device: { publicId: device.publicId }, favorites, positions, marks, settings },
      MeState,
    )
  })

  /* ── Favoriten ───────────────────────────────────────────────────────── */

  app.put('/favorites/:collection/:work', async (req, reply) => {
    const device = await requireDevice(req)
    const { collection, work } = WorkParams.parse(req.params)
    const body = FavoriteInput.parse(req.body ?? {})
    const w = await resolveWork(collection, work)

    /* Ohne Wunsch-Position hinten anstellen — Favoriten sind eine Liste in
       der Reihenfolge des Merkens, wie in der Vorlage. */
    let sortOrder = body.sortOrder
    if (sortOrder === undefined) {
      const last = await prisma.favorites.aggregate({
        where: { device_id: device.id },
        _max: { sort_order: true },
      })
      sortOrder = (last._max.sort_order ?? 0) + 10
    }

    await prisma.favorites.upsert({
      where: { device_id_work_id: { device_id: device.id, work_id: w.id } },
      update: { sort_order: sortOrder },
      create: { device_id: device.id, work_id: w.id, sort_order: sortOrder },
    })
    return reply.code(204).send()
  })

  app.delete('/favorites/:collection/:work', async (req, reply) => {
    const device = await requireDevice(req)
    const { collection, work } = WorkParams.parse(req.params)
    const w = await resolveWork(collection, work)
    await prisma.favorites.deleteMany({ where: { device_id: device.id, work_id: w.id } })
    return reply.code(204).send()
  })

  /* ── Lesepositionen: je Werk eine ────────────────────────────────────── */

  app.put('/positions/:collection/:work', async (req, reply) => {
    const device = await requireDevice(req)
    const { collection, work } = WorkParams.parse(req.params)
    const body = PositionInput.parse(req.body)
    const w = await resolveWork(collection, work)

    /* Der Vers muss zum Werk gehören — sonst zeigte die Wiederaufnahme-Karte
       einen Titel und spränge in ein anderes Buch. */
    if (body.verseId !== null) {
      const verse = await prisma.verses.findFirst({
        where: { id: BigInt(body.verseId), work_id: w.id },
        select: { id: true },
      })
      if (!verse) {
        throw badRequest('VERSE_NOT_IN_WORK', 'verseId gehört nicht zu diesem Werk.')
      }
    }

    const data = {
      verse_id: body.verseId === null ? null : BigInt(body.verseId),
      segment_index: body.segmentIndex,
      view_mode: body.viewMode,
    }
    await prisma.reading_positions.upsert({
      where: { device_id_work_id: { device_id: device.id, work_id: w.id } },
      update: data,
      create: { device_id: device.id, work_id: w.id, ...data },
    })
    return reply.code(204).send()
  })

  app.delete('/positions/:collection/:work', async (req, reply) => {
    const device = await requireDevice(req)
    const { collection, work } = WorkParams.parse(req.params)
    const w = await resolveWork(collection, work)
    await prisma.reading_positions.deleteMany({ where: { device_id: device.id, work_id: w.id } })
    return reply.code(204).send()
  })

  /* „Clear" der Vorlage: löscht die Position UND alle Markierungen eines
     ganzen Bereichs in einem Zug (clearDalailPlace räumt PLACE_KEY und alle
     d:-Schlüssel zusammen ab). */
  app.delete('/positions', async (req, reply) => {
    const device = await requireDevice(req)
    const { collection } = CollectionQuery.parse(req.query)
    await prisma.reading_positions.deleteMany({
      where: { device_id: device.id, works: { collections: { slug: collection } } },
    })
    return reply.code(204).send()
  })

  /* ── Markierungen ────────────────────────────────────────────────────── */

  app.put('/marks/:verseId/:segmentIndex', async (req, reply) => {
    const device = await requireDevice(req)
    const { verseId, segmentIndex } = MarkParams.parse(req.params)
    const verse = await prisma.verses.findUnique({
      where: { id: BigInt(verseId) },
      select: { id: true },
    })
    if (!verse) throw notFound('VERSE_NOT_FOUND', 'Diesen Vers gibt es nicht.')
    await prisma.verse_marks.upsert({
      where: {
        device_id_verse_id_segment_index: {
          device_id: device.id,
          verse_id: BigInt(verseId),
          segment_index: segmentIndex,
        },
      },
      update: {},
      create: { device_id: device.id, verse_id: BigInt(verseId), segment_index: segmentIndex },
    })
    return reply.code(204).send()
  })

  app.delete('/marks/:verseId/:segmentIndex', async (req, reply) => {
    const device = await requireDevice(req)
    const { verseId, segmentIndex } = MarkParams.parse(req.params)
    await prisma.verse_marks.deleteMany({
      where: { device_id: device.id, verse_id: BigInt(verseId), segment_index: segmentIndex },
    })
    return reply.code(204).send()
  })

  app.delete('/marks', async (req, reply) => {
    const device = await requireDevice(req)
    const { collection } = CollectionQuery.parse(req.query)
    await prisma.verse_marks.deleteMany({
      where: {
        device_id: device.id,
        verses: { works: { collections: { slug: collection } } },
      },
    })
    return reply.code(204).send()
  })

  /* ── Anzeigeeinstellungen ────────────────────────────────────────────── */

  app.put('/settings', async (req, reply) => {
    const device = await requireDevice(req)
    const body = DisplaySettingsInput.parse(req.body)

    /* Nur mitgeschickte Felder ändern sich — der Client schickt, was sich
       bewegt hat, nicht jedes Mal alles. */
    const data: Record<string, unknown> = {}
    if (body.viewMode !== undefined) data.view_mode = body.viewMode
    if (body.arScale !== undefined) data.ar_scale = body.arScale
    if (body.latinScale !== undefined) data.latin_scale = body.latinScale
    if (body.showTransliteration !== undefined) data.show_transliteration = body.showTransliteration
    if (body.showTranslation !== undefined) data.show_translation = body.showTranslation
    if (body.twoPages !== undefined) data.two_pages = body.twoPages
    if (body.scrollSpeedIdx !== undefined) data.scroll_speed_idx = body.scrollSpeedIdx

    await prisma.display_settings.upsert({
      where: { device_id: device.id },
      update: data,
      create: { device_id: device.id, ...data },
    })
    return reply.code(204).send()
  })
}
