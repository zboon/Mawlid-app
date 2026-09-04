#!/usr/bin/env node
/* Liest die Datenbank zurück und vergleicht sie gegen data/extracted/.

   Ein Import ohne automatische Gegenprüfung ist nicht fertig. Handvokalisierter
   arabischer Text ist unersetzlich, und ein verschluckter Codepoint fällt erst
   auf, wenn jemand beim Rezitieren stolpert.

   Der Vergleich ist BYTEWEISE. Kein trim(), keine Unicode-Normalisierung, keine
   Toleranz. Alles andere wäre Selbstbetrug.

   Usage: node tools/verify-migration.mjs [extractedDir]
   Beendet mit 1, sobald irgendetwas nicht stimmt. */

import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { normalizeArabic } from './lib/normalize.mjs';

const IN = process.argv[2] || 'data/extracted';
const D = JSON.parse(fs.readFileSync(path.join(IN, '_all.json'), 'utf8'));

function connectionConfig() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ''),
      charset: 'utf8mb4',
    };
  }
  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'mawalid',
    password: process.env.MYSQL_PASSWORD || 'mawalid-dev',
    database: process.env.MYSQL_DATABASE || 'mawalid',
    charset: 'utf8mb4',
  };
}

const db = await mysql.createConnection(connectionConfig());
const q = async (sql, args) => (await db.query(sql, args))[0];

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

/* ── 1 · Vollständigkeit ────────────────────────────────────────────────── */

const CONTENT = [
  'QASIDAS', 'DALAIL_CHAPTERS', 'DIYA_CHAPTERS', 'BARZANJI_CHAPTERS',
  'NASHEED_CHAPTERS', 'LITANY_CHAPTERS', 'BURDAH_CHAPTERS', 'SIRAH_CHAPTERS',
  'ILAHI_CHAPTERS',
];
const srcVerses = CONTENT.reduce(
  (a, k) => a + D[k].reduce((b, c) => b + (c.verses?.length || 0), 0),
  0,
);

const [{ n: dbVerses }] = await q('SELECT COUNT(*) AS n FROM verses');
check('Versanzahl', dbVerses === srcVerses, `Quelle ${srcVerses}, Datenbank ${dbVerses}`);

const [{ n: dbWorks }] = await q('SELECT COUNT(*) AS n FROM works');
/* 111 Stücke minus die zwei Litanei-Titelträger, die zu Sammlungen wurden. */
check('Werkanzahl', dbWorks === 109, `erwartet 109, Datenbank ${dbWorks}`);

const untitled = await q(`
  SELECT w.id FROM works w
  LEFT JOIN work_translations t ON t.work_id = w.id
  GROUP BY w.id HAVING COUNT(t.work_id) = 0`);
check('Jedes Werk hat einen Titel', untitled.length === 0, `${untitled.length} ohne Titel`);

/* ── 2 · Zeichentreue — die wichtigste Prüfung ──────────────────────────── */

/* Jeder Verstext der Quelle, an seiner Position, gegen die Datenbank. Der
   Schlüssel ist (Sammlungs-Slug, Werk-Position, Vers-Position, Rolle), damit
   die Zuordnung nicht über die Ids läuft, die der Import selbst vergeben hat. */
const dbTexts = await q(`
  SELECT c.slug AS coll, w.sort_order AS wpos, v.position AS vpos,
         vt.role, vt.lang, vt.script, vt.body, vt.body_search
  FROM verse_texts vt
  JOIN verses v ON v.id = vt.verse_id
  JOIN works  w ON w.id = v.work_id
  JOIN collections c ON c.id = w.collection_id`);

const byKey = new Map();
for (const r of dbTexts) byKey.set(`${r.coll}|${r.wpos}|${r.vpos}|${r.role}`, r);

/* Dieselbe Zuordnung Quelle → Sammlung wie im Seed-Bauer. Bewusst noch einmal
   ausgeschrieben statt importiert: eine Prüfung, die dieselbe Funktion benutzt
   wie das Geprüfte, prüft nichts. */
const SECTION_RE = /^(\d+)(b?)\s*·\s*(.*)$/;
const hasNumber = (t) => SECTION_RE.test(t || '');
const AZAM_FIRST = D.AZAM_FIRST, ISTIGHFAR_FIRST = D.ISTIGHFAR_FIRST;

const expected = [];
const pushPiece = (piece, coll, wpos) => {
  (piece.verses || []).forEach((v, vpos) => {
    const latin = piece.latin === true;
    if (v.ar) expected.push({ coll, wpos, vpos, role: 'original', body: v.ar, latin });
    if (v.tr) expected.push({ coll, wpos, vpos, role: 'transliteration', body: v.tr });
    if (v.en) expected.push({ coll, wpos, vpos, role: 'translation', body: v.en });
  });
};

D.DALAIL_CHAPTERS.forEach((c, i) => pushPiece(c, 'wochenteile', i));

const mawlid = [];
D.QASIDAS.forEach((p) => hasNumber(p.titleEnglish) && mawlid.push(p));
D.SIRAH_CHAPTERS.forEach((p) => hasNumber(p.titleEnglish) && mawlid.push(p));
mawlid.sort((a, b) => {
  const A = SECTION_RE.exec(a.titleEnglish), B = SECTION_RE.exec(b.titleEnglish);
  return (+A[1] + (A[2] ? 0.5 : 0)) - (+B[1] + (B[2] ? 0.5 : 0));
});
mawlid.forEach((p, i) => pushPiece(p, 'daybai', i));

D.BARZANJI_CHAPTERS.forEach((c, i) => pushPiece(c, 'barzanji', i));
D.DIYA_CHAPTERS.forEach((c, i) => pushPiece(c, 'diya', i));
D.BURDAH_CHAPTERS.forEach((c, i) => pushPiece(c, 'burdah', i));
D.QASIDAS.filter((p) => p.group === 'qasidas' && !hasNumber(p.titleEnglish)).forEach((p, i) =>
  pushPiece(p, 'qasidas', i),
);
D.ILAHI_CHAPTERS.forEach((c, i) => pushPiece(c, 'ilahis', i));
D.LITANY_CHAPTERS.forEach((c, i) => {
  if (i === 2 || i === 3) return; // Titelträger, wurden Sammlungen
  const coll =
    i >= AZAM_FIRST && i <= AZAM_FIRST + 6 ? 'azam'
    : i >= ISTIGHFAR_FIRST && i <= ISTIGHFAR_FIRST + 6 ? 'istighfar'
    : 'einzelne';
  pushPiece(c, coll, i);
});

let missing = 0, mismatched = 0;
const firstDiff = [];
for (const e of expected) {
  const got = byKey.get(`${e.coll}|${e.wpos}|${e.vpos}|${e.role}`);
  if (!got) { missing++; if (firstDiff.length < 3) firstDiff.push({ ...e, why: 'fehlt' }); continue; }
  if (got.body !== e.body) {
    mismatched++;
    if (firstDiff.length < 3) {
      let at = 0;
      while (at < e.body.length && e.body[at] === got.body[at]) at++;
      firstDiff.push({
        coll: e.coll, wpos: e.wpos, vpos: e.vpos, role: e.role, why: 'weicht ab',
        at, src: e.body.slice(at, at + 20), db: (got.body || '').slice(at, at + 20),
      });
    }
  }
}
check('Verstexte bytegleich', missing === 0 && mismatched === 0,
  `${expected.length} geprüft, ${missing} fehlen, ${mismatched} weichen ab`);
check('Keine überzähligen Texte', dbTexts.length === expected.length,
  `Quelle ${expected.length}, Datenbank ${dbTexts.length}`);

/* Die Auszeichnungen, die man beim Umkopieren am leichtesten verliert. */
const countOf = (s, ch) => (s.match(new RegExp(ch, 'g')) || []).length;
for (const [label, ch] of [['۞ Rosetten', '۞'], ['‖ Seitenumbrüche', '‖'], ['Zeilenumbrüche', '\\n']]) {
  const src = expected.reduce((a, e) => a + countOf(e.body, ch), 0);
  const got = dbTexts.reduce((a, r) => a + countOf(r.body, ch), 0);
  check(label, src === got, `Quelle ${src}, Datenbank ${got}`);
}

/* ── 3 · Struktur ───────────────────────────────────────────────────────── */

/* Folio-Bereiche müssen jeden Vers ihres Werkes genau einmal abdecken. */
const folioGaps = await q(`
  SELECT w.id, w.slug,
         (SELECT COUNT(*) FROM verses v WHERE v.work_id = w.id) AS verses,
         (SELECT COALESCE(SUM(f.verse_to - f.verse_from + 1), 0) FROM folios f WHERE f.work_id = w.id) AS covered
  FROM works w WHERE w.has_folios = 1
  HAVING verses <> covered`);
check('Folios decken jeden Vers genau einmal', folioGaps.length === 0,
  folioGaps.map((r) => `${r.slug}: ${r.covered}/${r.verses}`).join(', '));

/* Der Wochenplan muss auf dasselbe Werk zeigen wie die alte Indextabelle. */
const planChecks = [
  ['wochenteile', D.DALAIL_TODAY_IDX, (i) => ({ coll: 'wochenteile', wpos: i })],
  ['azam-woche', D.AZAM_TODAY_IDX, (i) => ({ coll: 'azam', wpos: i })],
  ['istighfar-woche', D.ISTIGHFAR_TODAY_IDX, (i) => ({ coll: 'istighfar', wpos: i })],
];
let planBad = 0;
for (const [slug, map, locate] of planChecks) {
  for (const [weekday, idx] of Object.entries(map)) {
    const want = locate(Number(idx));
    const rows = await q(`
      SELECT c.slug AS coll, w.sort_order AS wpos
      FROM schedules s
      JOIN schedule_slots sl ON sl.schedule_id = s.id
      JOIN works w ON w.id = sl.work_id
      JOIN collections c ON c.id = w.collection_id
      WHERE s.slug = ? AND sl.weekday = ?`, [slug, Number(weekday)]);
    if (!rows.length || rows[0].coll !== want.coll || rows[0].wpos !== want.wpos) planBad++;
  }
}
check('Wochentag zeigt auf dasselbe Werk wie vorher', planBad === 0, `${planBad} Abweichungen`);

/* Die Mawlid-Folge muss Stück für Stück dieselbe Ordnung haben. */
const seq = await q(`
  SELECT si.ordinal, si.source_label, w.sort_order AS wpos
  FROM sequence_items si JOIN works w ON w.id = si.work_id
  JOIN sequences s ON s.id = si.sequence_id
  ORDER BY si.ordinal`);
const seqOk =
  seq.length === mawlid.length &&
  seq.every((r, i) => r.ordinal === i + 1 && r.wpos === i &&
    r.source_label === SECTION_RE.exec(mawlid[i].titleEnglish)[1] +
      (SECTION_RE.exec(mawlid[i].titleEnglish)[2] || ''));
check('Mawlid-Lesereihenfolge identisch', seqOk, `${seq.length} Einträge, erwartet ${mawlid.length}`);

/* ── 4 · Suchgleichheit ─────────────────────────────────────────────────── */

/* Die anspruchsvollste Prüfung und die wertvollste: sie belegt, dass die
   Normalisierung wirklich übernommen wurde und nicht nur ungefähr. Sie
   vergleicht, welche WERKE ein Begriff trifft — in der Vorlage und in der
   Datenbank. */
const TERMS = [
  'muhammad', 'muhamad', 'mohammed', 'qasida', 'kaseeda', 'qaseeda',
  'salawat', 'salaam', 'salam', 'rasul', 'rasool', 'nabi', 'nabee',
  'allahumma', 'alahuma', 'burda', 'burdah', 'jazuli', 'ya rabbi',
  'mawlaya', 'mawla ya', 'ar rahman', 'arrahman', 'ibrahim', 'istighfar',
  'astaghfirullah', 'subhan', 'subhaan', 'ghafur', 'gafur', 'khayrat',
  'hayrat', 'dalail', 'dalaail', 'shifa', 'sifa', 'thumma', 'tuma',
  'محمد', 'اللهم', 'صلى', 'الرحمن', 'دلائل',
];

/* Die Vorlage: normalisierter Heuhaufen je Stück, wie haystack() ihn baut. */
const srcHay = [];
const addHay = (piece, coll, wpos) => {
  const parts = [piece.titleEnglish, piece.titleArabic];
  (piece.verses || []).forEach((v) => parts.push(v.tr, v.en, v.ar));
  srcHay.push({ coll, wpos, norm: normalizeArabic(parts.join(' ')) });
};
D.DALAIL_CHAPTERS.forEach((c, i) => addHay(c, 'wochenteile', i));
mawlid.forEach((p, i) => addHay(p, 'daybai', i));
D.BARZANJI_CHAPTERS.forEach((c, i) => addHay(c, 'barzanji', i));
D.DIYA_CHAPTERS.forEach((c, i) => addHay(c, 'diya', i));
D.BURDAH_CHAPTERS.forEach((c, i) => addHay(c, 'burdah', i));
D.QASIDAS.filter((p) => p.group === 'qasidas' && !hasNumber(p.titleEnglish)).forEach((p, i) =>
  addHay(p, 'qasidas', i));
D.ILAHI_CHAPTERS.forEach((c, i) => addHay(c, 'ilahis', i));
D.LITANY_CHAPTERS.forEach((c, i) => {
  if (i === 2 || i === 3) return;
  const coll = i >= AZAM_FIRST && i <= AZAM_FIRST + 6 ? 'azam'
    : i >= ISTIGHFAR_FIRST && i <= ISTIGHFAR_FIRST + 6 ? 'istighfar' : 'einzelne';
  addHay(c, coll, i);
});

let searchBad = 0;
const searchDetail = [];
for (const term of TERMS) {
  const nq = normalizeArabic(term);
  const want = new Set(srcHay.filter((h) => h.norm.includes(nq)).map((h) => `${h.coll}|${h.wpos}`));
  /* Verse UND Titel, so wie die Vorlage beides in denselben Heuhaufen legt.
     Ein Werk, dessen Titel den Begriff trägt, dessen Verse aber nicht, wäre
     sonst unauffindbar — bei "Burdah" oder "Qasida" der Regelfall. */
  const rows = await q(`
    SELECT DISTINCT c.slug AS coll, w.sort_order AS wpos
    FROM verse_texts vt
    JOIN verses v ON v.id = vt.verse_id
    JOIN works  w ON w.id = v.work_id
    JOIN collections c ON c.id = w.collection_id
    WHERE vt.body_search LIKE CONCAT('%', ?, '%')
    UNION
    SELECT DISTINCT c.slug, w.sort_order
    FROM work_translations wt
    JOIN works w ON w.id = wt.work_id
    JOIN collections c ON c.id = w.collection_id
    WHERE wt.title_search LIKE CONCAT('%', ?, '%')`, [nq, nq]);
  const got = new Set(rows.map((r) => `${r.coll}|${r.wpos}`));
  /* Die Datenbank darf nicht WENIGER finden. Mehr ist möglich und in Ordnung:
     die Vorlage durchsucht auch die Titel, die nicht in verse_texts stehen —
     deshalb wird auf Teilmenge geprüft, nicht auf Gleichheit. */
  const lost = [...want].filter((k) => !got.has(k));
  if (lost.length) { searchBad++; if (searchDetail.length < 4) searchDetail.push(`${term}: ${lost.length} verloren`); }
}

check(`Suche findet weiterhin alles (${TERMS.length} Begriffe)`, searchBad === 0,
  searchDetail.join(', '));

/* ── Bericht ────────────────────────────────────────────────────────────── */

await db.end();

const width = Math.max(...results.map((r) => r.name.length));
console.log();
for (const r of results) {
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.name.padEnd(width)}  ${r.detail}`);
}
if (firstDiff.length) {
  console.log('\nErste Abweichungen:');
  for (const d of firstDiff) console.log('   ', JSON.stringify(d));
}

const failed = results.filter((r) => !r.ok);
console.log();
if (failed.length) {
  console.error(`${failed.length} von ${results.length} Prüfungen fehlgeschlagen.`);
  process.exit(1);
}
console.log(`Alle ${results.length} Prüfungen bestanden.`);
