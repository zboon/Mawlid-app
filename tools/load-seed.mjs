#!/usr/bin/env node
/* Schreibt db/seed/*.json in die Datenbank.

   In EINER Transaktion: bricht irgendetwas ab, bleibt die Datenbank
   unverändert. Und idempotent — die Inhaltstabellen werden geleert und neu
   gefüllt, während Benutzer, Favoriten und Lesepositionen unberührt bleiben.
   Der Import darf beliebig oft laufen.

   Usage: node tools/load-seed.mjs [seedDir]
   Zugang über DATABASE_URL, sonst die Standardwerte aus .env.example. */

import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

const SEED = process.argv[2] || 'db/seed';

/* Die Reihenfolge ist nicht beliebig: Fremdschlüssel verlangen, dass das Ziel
   vor dem Verweis existiert. Gelöscht wird in der Gegenrichtung. */
const ORDER = [
  'modules',
  'module_translations',
  'collections',
  'collection_translations',
  'works',
  'work_translations',
  'verses',
  'verse_texts',
  'folios',
  'reciters',
  'media',
  'schedules',
  'schedule_slots',
  'sequences',
  'sequence_items',
  'text_annotations',
  'text_annotation_translations',
];

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

const rows = (t) => JSON.parse(fs.readFileSync(path.join(SEED, `${t}.json`), 'utf8'));

const db = await mysql.createConnection({
  ...connectionConfig(),
  /* Ohne das kommen mehrzeilige Statements nicht durch; wir brauchen es für
     die Fremdschlüssel-Klammer unten. */
  multipleStatements: true,
});

/* Der Zeichensatz ist die eine Einstellung, bei der ein Fehler still bleibt
   und erst Wochen später als Fragezeichen mitten in einer Sure auffällt. */
const [[charset]] = await db.query(
  "SHOW VARIABLES WHERE Variable_name IN ('character_set_client','character_set_connection')",
);
if (charset && !String(charset.Value).startsWith('utf8mb4')) {
  throw new Error(`Verbindung läuft mit ${charset.Value}, erwartet wird utf8mb4.`);
}

/* Schema-Nachzügler. db/schema.sql beschreibt nur die Erstanlage — eine
   Datenbank, die vor einer Schemaänderung angelegt wurde, bekommt die neuen
   Spalten hier nachgezogen, damit `npm run db:all` ohne Neuaufsetzen
   funktioniert. Die Definitionen müssen wortgleich zu db/schema.sql bleiben.
   DDL löst in MySQL ein implizites COMMIT aus, deshalb steht dieser Block
   VOR der Lade-Transaktion. */
const UPGRADES = [
  ['modules', 'theme_key', 'ADD COLUMN theme_key VARCHAR(24) NULL AFTER icon_key'],
  ['modules', 'in_menu', 'ADD COLUMN in_menu TINYINT(1) NOT NULL DEFAULT 1 AFTER is_published'],
  ['works', 'in_search', 'ADD COLUMN in_search TINYINT(1) NOT NULL DEFAULT 1 AFTER has_folios'],
];
for (const [table, column, ddl] of UPGRADES) {
  const [[hit]] = await db.query(
    'SELECT 1 AS hit FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
    [table, column],
  );
  if (!hit) {
    await db.query(`ALTER TABLE \`${table}\` ${ddl}`);
    console.log(`  Schema nachgezogen: ${table}.${column}`);
  }
}

/* Ganze Tabellen, die nach der Erstanlage dazugekommen sind. Die Anweisung
   wird aus db/schema.sql herausgeschnitten und unverändert ausgeführt —
   wortgleich per Konstruktion, nicht per Disziplin. */
const TABLE_UPGRADES = ['display_settings'];
for (const table of TABLE_UPGRADES) {
  const [[hit]] = await db.query(
    'SELECT 1 AS hit FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    [table],
  );
  if (hit) continue;
  const schemaSql = fs.readFileSync('db/schema.sql', 'utf8');
  const m = schemaSql.match(
    new RegExp(`CREATE TABLE ${table} \\([\\s\\S]*?\\) ENGINE=[^;]+;`),
  );
  if (!m) throw new Error(`CREATE TABLE ${table} nicht in db/schema.sql gefunden.`);
  await db.query(m[0]);
  console.log(`  Schema nachgezogen: Tabelle ${table}`);
}

await db.beginTransaction();
try {
  /* Beim Leeren stören die Fremdschlüssel — innerhalb der Transaktion ist das
     unbedenklich, weil am Ende ohnehin ein konsistenter Zustand steht. */
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of [...ORDER].reverse()) {
    await db.query(`DELETE FROM \`${table}\``);
  }

  let total = 0;
  for (const table of ORDER) {
    const data = rows(table);
    if (!data.length) {
      console.log(`  ${table.padEnd(30)} —`);
      continue;
    }
    const cols = Object.keys(data[0]);
    const placeholders = `(${cols.map(() => '?').join(',')})`;
    /* In Blöcken statt einzeln: 5.834 Verstexte als 5.834 Einzel-INSERTs
       dauern spürbar länger als ein paar Sammelanweisungen. */
    const CHUNK = 500;
    for (let i = 0; i < data.length; i += CHUNK) {
      const slice = data.slice(i, i + CHUNK);
      const values = slice.flatMap((r) => cols.map((c) => r[c] ?? null));
      await db.query(
        `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(',')}) VALUES ` +
          slice.map(() => placeholders).join(','),
        values,
      );
    }
    total += data.length;
    console.log(`  ${table.padEnd(30)} ${String(data.length).padStart(6)}`);
  }

  await db.query('SET FOREIGN_KEY_CHECKS = 1');
  await db.commit();
  console.log(`\n${total} Zeilen geschrieben.`);
} catch (err) {
  await db.rollback();
  console.error('\nAbgebrochen, nichts geändert:', err.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
