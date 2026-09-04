#!/usr/bin/env node
/* Gegenprüfung der API — dieselbe Haltung wie tools/verify-migration.mjs.
 *
 * Phase 2 hat bewiesen, dass die Datenbank die Quelle bytegleich enthält.
 * Diese Prüfung beweist das Nächste: dass die API sie bytegleich HERAUSGIBT.
 * Dazwischen liegen Prisma, JSON und ein HTTP-Server — drei Stellen, an denen
 * ein Zeichen still verschwinden kann.
 *
 * Sie fragt die Datenbank direkt und vergleicht mit dem, was über HTTP kommt.
 * Sie benutzt bewusst NICHT den Code der API dafür: eine Prüfung, die dieselbe
 * Funktion benutzt wie das Geprüfte, prüft nichts.
 *
 *   node tools/verify-api.mjs                     # gegen http://127.0.0.1:3000
 *   API=http://127.0.0.1:3001 node tools/verify-api.mjs
 */

import mysql from 'mysql2/promise'

const API = process.env.API ?? 'http://127.0.0.1:3000'
const DB = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'mawalid',
  password: process.env.DB_PASSWORD ?? 'mawalid-dev',
  database: process.env.DB_NAME ?? 'mawalid',
  charset: 'utf8mb4',
}

const results = []
const record = (ok, name, detail = '') => results.push({ ok, name, detail })

async function get(path, headers = {}) {
  const res = await fetch(`${API}${path}`, { headers })
  const text = await res.text()
  return { res, text, json: text ? JSON.parse(text) : null }
}

async function main() {
  const db = await mysql.createConnection(DB)
  const [charset] = await db.query("SHOW VARIABLES LIKE 'character_set_client'")
  if (!String(charset[0]?.Value ?? '').startsWith('utf8mb4')) {
    throw new Error('Verbindung ist nicht utf8mb4 — jeder Vergleich wäre wertlos.')
  }

  /* 1 · Module und Zählungen */
  {
    const { res, json } = await get('/api/content/modules')
    const [rows] = await db.query(`
      SELECT m.slug,
             CAST(COUNT(DISTINCT c.id) AS SIGNED) AS collections,
             CAST(COUNT(DISTINCT w.id) AS SIGNED) AS works,
             CAST(COUNT(v.id)          AS SIGNED) AS verses
        FROM modules m
        LEFT JOIN collections c ON c.module_id = m.id AND c.is_published = 1
        LEFT JOIN works w       ON w.collection_id = c.id AND w.status = 'published'
        LEFT JOIN verses v      ON v.work_id = w.id
       WHERE m.is_published = 1
       GROUP BY m.id
       ORDER BY m.sort_order`)

    const apiSlugs = json.modules.map((m) => m.slug).join(',')
    const dbSlugs = rows.map((r) => r.slug).join(',')
    record(res.status === 200 && apiSlugs === dbSlugs, 'Module und Reihenfolge', apiSlugs)

    const wrong = []
    for (const r of rows) {
      const m = json.modules.find((x) => x.slug === r.slug)
      if (!m) { wrong.push(`${r.slug} fehlt`); continue }
      if (m.counts.collections !== Number(r.collections)) wrong.push(`${r.slug}.collections ${m.counts.collections}≠${r.collections}`)
      if (m.counts.works !== Number(r.works)) wrong.push(`${r.slug}.works ${m.counts.works}≠${r.works}`)
      if (m.counts.verses !== Number(r.verses)) wrong.push(`${r.slug}.verses ${m.counts.verses}≠${r.verses}`)
    }
    record(wrong.length === 0, 'Zählungen je Modul', wrong.length ? wrong.join('; ') : `${rows.length} Module`)
  }

  /* 2 · Sammlungen: jede Werkliste vollständig und in der richtigen Ordnung */
  {
    const [colls] = await db.query(`
      SELECT c.id, c.slug, m.slug AS module_slug
        FROM collections c JOIN modules m ON m.id = c.module_id
       WHERE c.is_published = 1 AND m.is_published = 1
       ORDER BY c.id`)
    const problems = []
    for (const c of colls) {
      const { res, json } = await get(`/api/content/collections/${c.slug}?module=${c.module_slug}`)
      if (res.status !== 200) { problems.push(`${c.slug}: HTTP ${res.status}`); continue }
      const [works] = await db.query(
        `SELECT slug FROM works WHERE collection_id = ? AND status = 'published' ORDER BY sort_order`,
        [c.id],
      )
      const a = json.works.map((w) => w.slug).join(',')
      const b = works.map((w) => w.slug).join(',')
      if (a !== b) problems.push(`${c.slug}: ${a} ≠ ${b}`)
    }
    record(problems.length === 0, 'Werklisten je Sammlung', problems.length ? problems.join(' | ') : `${colls.length} Sammlungen`)
  }

  /* 3 · Verstexte bytegleich — der eigentliche Punkt */
  {
    const [works] = await db.query(`
      SELECT w.id, w.slug, c.slug AS coll_slug
        FROM works w
        JOIN collections c ON c.id = w.collection_id
        JOIN modules m     ON m.id = c.module_id
       WHERE w.status = 'published' AND c.is_published = 1 AND m.is_published = 1
       ORDER BY w.id`)

    let compared = 0
    const missing = []
    const differing = []
    const structure = []

    for (const w of works) {
      const { res, json } = await get(
        `/api/content/works/${w.slug}?collection=${w.coll_slug}&lang=en`,
      )
      if (res.status !== 200) { structure.push(`${w.slug}: HTTP ${res.status}`); continue }

      const [verses] = await db.query(
        `SELECT v.position, v.verse_kind, v.band_label, v.note_label, v.separator_mark,
                v.no_rosette, v.short_page, t.role, t.lang, t.script, t.body
           FROM verses v
           LEFT JOIN verse_texts t ON t.verse_id = v.id
          WHERE v.work_id = ?
          ORDER BY v.position, t.role`,
        [w.id],
      )

      const byPosition = new Map()
      for (const r of verses) {
        if (!byPosition.has(r.position)) byPosition.set(r.position, { row: r, texts: {} })
        if (r.role) byPosition.get(r.position).texts[r.role] = r
      }

      if (json.verses.length !== byPosition.size) {
        structure.push(`${w.slug}: ${json.verses.length} Verse in der API, ${byPosition.size} in der Datenbank`)
      }

      for (const v of json.verses) {
        const src = byPosition.get(v.position)
        if (!src) { missing.push(`${w.slug}#${v.position}`); continue }

        if (
          v.kind !== src.row.verse_kind ||
          (v.bandLabel ?? null) !== (src.row.band_label ?? null) ||
          (v.noteLabel ?? null) !== (src.row.note_label ?? null) ||
          (v.separator ?? null) !== (src.row.separator_mark ?? null) ||
          v.noRosette !== !!src.row.no_rosette ||
          v.shortPage !== !!src.row.short_page
        ) {
          structure.push(`${w.slug}#${v.position}: Eigenschaften weichen ab`)
        }

        for (const role of ['original', 'transliteration', 'translation']) {
          /* Die API liefert bei `translation` nur EINE Sprache. Verglichen wird
             gegen genau die, die sie nennt — sonst prüfte man gegen eine
             Übersetzung, die gar nicht angefordert war. */
          const want = role === 'translation'
            ? Object.values(src.texts).find((t) => t.role === 'translation' && t.lang === json.lang)
            : src.texts[role]
          const got = v.texts[role]
          if (!want && !got) continue
          if (!want || !got) { missing.push(`${w.slug}#${v.position}.${role}`); continue }
          compared += 1
          if (got.body !== want.body) {
            differing.push(`${w.slug}#${v.position}.${role}`)
          }
          if (got.lang !== want.lang || got.script !== want.script) {
            structure.push(`${w.slug}#${v.position}.${role}: ${got.lang}/${got.script} ≠ ${want.lang}/${want.script}`)
          }
        }
      }

      /* Folios und Medien */
      const [folios] = await db.query(
        `SELECT position, verse_from, verse_to FROM folios WHERE work_id = ? ORDER BY position`,
        [w.id],
      )
      if (folios.length !== json.folios.length) {
        structure.push(`${w.slug}: ${json.folios.length} Blätter, erwartet ${folios.length}`)
      } else {
        for (const [i, f] of folios.entries()) {
          const g = json.folios[i]
          if (g.from !== f.verse_from || g.to !== f.verse_to || g.position !== f.position) {
            structure.push(`${w.slug}: Blatt ${f.position} weicht ab`)
          }
        }
      }
      const [[media]] = await db.query(
        `SELECT COUNT(*) AS n FROM media WHERE work_id = ?`, [w.id],
      )
      if (Number(media.n) !== json.media.length) {
        structure.push(`${w.slug}: ${json.media.length} Medien, erwartet ${media.n}`)
      }
    }

    record(missing.length === 0, 'Kein Vers und kein Text fehlt', missing.length ? missing.slice(0, 5).join(', ') : `${works.length} Werke`)
    record(differing.length === 0, 'Verstexte bytegleich', `${compared} verglichen, ${differing.length} weichen ab${differing.length ? ': ' + differing.slice(0, 5).join(', ') : ''}`)
    record(structure.length === 0, 'Eigenschaften, Blätter und Medien', structure.length ? structure.slice(0, 5).join(' | ') : 'alle gleich')
  }

  /* 4 · Wochenplan — dieselbe Zuordnung wie in der Datenbank */
  {
    const [slots] = await db.query(`
      SELECT sl.weekday, w.slug
        FROM schedules s
        JOIN schedule_slots sl ON sl.schedule_id = s.id
        JOIN works w           ON w.id = sl.work_id
        JOIN collections c     ON c.id = s.collection_id
       WHERE c.slug = 'wochenteile'
       ORDER BY sl.weekday, sl.slot_index`)
    const wrong = []
    for (let day = 0; day <= 6; day += 1) {
      const { json } = await get(`/api/content/schedule/wochenteile/today?weekday=${day}`)
      const a = json.works.map((w) => w.slug).join(',')
      const b = slots.filter((s) => s.weekday === day).map((s) => s.slug).join(',')
      if (a !== b) wrong.push(`Tag ${day}: ${a} ≠ ${b}`)
    }
    record(wrong.length === 0, 'Wochenplan an sieben Tagen', wrong.length ? wrong.join('; ') : '7 Tage geprüft')
  }

  /* 5 · Glossen: die Regeln ohne work_id müssen bei JEDEM Werk ankommen */
  {
    const [[global]] = await db.query(
      `SELECT COUNT(*) AS n FROM text_annotations WHERE is_active = 1 AND work_id IS NULL`,
    )
    const { json } = await get('/api/content/works/tuesday?collection=wochenteile')
    record(
      json.annotations.length >= Number(global.n),
      'Allgemeine Glossenregeln kommen mit',
      `${json.annotations.length} geliefert, ${global.n} allgemeine erwartet`,
    )
  }

  /* 6 · Zwischenspeicherung */
  {
    const first = await get('/api/content/works/tuesday?collection=wochenteile')
    const etag = first.res.headers.get('etag')
    const second = await fetch(`${API}/api/content/works/tuesday?collection=wochenteile`, {
      headers: { 'If-None-Match': etag },
    })
    const weak = await fetch(`${API}/api/content/works/tuesday?collection=wochenteile`, {
      headers: { 'If-None-Match': `W/${etag}` },
    })
    const stale = await fetch(`${API}/api/content/works/tuesday?collection=wochenteile`, {
      headers: { 'If-None-Match': '"work-alt-1-aaaaaaaaaa"' },
    })
    record(
      Boolean(etag) && second.status === 304 && weak.status === 304 && stale.status === 200,
      'ETag und If-None-Match',
      `${etag} → ${second.status}/${weak.status}/${stale.status}`,
    )
  }

  /* 7 · Unveröffentlichtes bleibt unsichtbar */
  {
    const [drafts] = await db.query(
      `SELECT w.slug, c.slug AS coll FROM works w JOIN collections c ON c.id = w.collection_id
        WHERE w.status <> 'published' LIMIT 5`,
    )
    const leaked = []
    for (const d of drafts) {
      const { res } = await get(`/api/content/works/${d.slug}?collection=${d.coll}`)
      if (res.status !== 404) leaked.push(`${d.slug}: ${res.status}`)
    }
    const { res: hidden } = await get('/api/content/modules/wiki')
    if (hidden.status !== 404) leaked.push(`Modul wiki: ${hidden.status}`)
    record(leaked.length === 0, 'Entwürfe antworten mit 404', leaked.length ? leaked.join(', ') : `${drafts.length} Entwürfe geprüft`)
  }

  await db.end()

  /* ── Bericht ─────────────────────────────────────────────────────────── */
  const width = Math.max(...results.map((r) => r.name.length)) + 2
  console.log('')
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.name.padEnd(width)}${r.detail}`)
  }
  const failed = results.filter((r) => !r.ok).length
  console.log('')
  console.log(failed === 0
    ? `Alle ${results.length} Prüfungen bestanden.`
    : `${failed} von ${results.length} Prüfungen fehlgeschlagen.`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
