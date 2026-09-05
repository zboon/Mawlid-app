#!/usr/bin/env node
/* Der Suchgleichstand: alt gegen neu, dieselben Werke.
 *
 * Das „Fertig, wenn" der Phase 4 (docs/plan/roadmap.md): vierzig und mehr
 * Suchbegriffe — arabisch, in Umschrift, englisch, mit Tippfehlern — liefern
 * in beiden Apps dieselben Werke.
 *
 * Die alte Seite antwortet mit IHREM EIGENEN CODE: die originale index.html
 * läuft in einem echten Browser, der Begriff wird in state.query gelegt und
 * renderResults() gerendert — mitsamt aller Filter (leere Litanei-Kapitel,
 * Titelseite, aufgelöste Wochen-Gruppierung), die niemand nachbauen muss und
 * daher auch niemand falsch nachbauen kann. Die neue Seite antwortet über
 * GET /api/content/search. Verglichen werden Titelmengen (arabischer +
 * angezeigter lateinischer Titel), nicht Positionen — Reihenfolge ist nicht
 * Teil des Versprechens, die MENGE der Werke ist es.
 *
 * Voraussetzungen: laufende API (PORT 3000 oder env API), Chromium für
 * Playwright (env PLAYWRIGHT_CHROMIUM zeigt auf die Binärdatei, sonst der
 * Standardfund von @playwright/test).
 *
 *   node tools/verify-search.mjs
 */

import fs from 'node:fs';
import http from 'node:http';

const API = process.env.API ?? 'http://127.0.0.1:3000';

/* Die 43 Begriffe der Migrationsprüfung, erweitert um die Fälle, die dort
   nicht vorkommen konnten (sie prüfte nur die normalisierte LIKE-Stufe):
   rohe Diakritika, englische Übersetzungswörter, vokalisiertes Arabisch,
   die Buchnummer eines Mawlid-Stücks. */
const TERMS = [
  'muhammad', 'muhamad', 'mohammed', 'qasida', 'kaseeda', 'qaseeda',
  'salawat', 'salaam', 'salam', 'rasul', 'rasool', 'nabi', 'nabee',
  'allahumma', 'alahuma', 'burda', 'burdah', 'jazuli', 'ya rabbi',
  'mawlaya', 'mawla ya', 'ar rahman', 'arrahman', 'ibrahim', 'istighfar',
  'astaghfirullah', 'subhan', 'subhaan', 'ghafur', 'gafur', 'khayrat',
  'hayrat', 'dalail', 'dalaail', 'shifa', 'sifa', 'thumma', 'tuma',
  'محمد', 'اللهم', 'صلى', 'الرحمن', 'دلائل',
  /* rohe Umschrift mit Diakritika — Stufe 3 (wörtlich) */
  'Muḥammad', 'Salām', 'ṣalli', 'Dalāʾil',
  /* englisch */
  'mercy', 'light', 'blessings', 'intercession',
  /* weitere Tippfehler und Straffung */
  'mohamed', 'kayrat', 'yanabi',
  /* vokalisiertes Arabisch — Stufe 1 nach Faltung */
  'مُحَمَّد', 'دَلَائِل',
  /* die Buchnummer, die der Import nach source_label verlegt hat */
  '13',
];

/* ── Die alte App, von sich selbst befragt ──────────────────────────────── */

async function askLegacy(terms) {
  let chromium;
  try {
    ({ chromium } = await import('@playwright/test'));
  } catch {
    throw new Error(
      '@playwright/test fehlt. Einmal `npm install` im Wurzelverzeichnis; ' +
        'für den Browser PLAYWRIGHT_CHROMIUM auf eine Chromium-Binärdatei zeigen lassen.',
    );
  }

  const html = fs.readFileSync('index.html');
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined,
  });
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
    /* renderResults() muss existieren, sonst prüfen wir gegen eine halbe App. */
    await page.waitForFunction(() => typeof window.renderResults === 'function');

    return await page.evaluate((list) => {
      const out = {};
      /* openDalail(7) → Kürzel 'd' → DALAIL_CHAPTERS[7]: die Karte einer
         Suche zeigt auf ihre Öffnungsfunktion, und die kennt ihr Array. */
      const kinds = ['q', 's', 'b', 'i', 'd', 'z', 'y', 'n', 'l'];
      const fnToKind = {};
      for (const k of kinds) fnToKind[window.openFnOf(k)] = k;

      for (const term of list) {
        /* `state` ist ein const der Seite und hängt nicht an window;
           updateSearch() ist der offizielle Weg hinein. */
        window.updateSearch(term);
        const holder = document.createElement('div');
        holder.innerHTML = window.renderResults();
        const keys = [];
        for (const btn of holder.querySelectorAll('button[onclick]')) {
          if (btn.classList.contains('hit')) continue; // Trefferzeile, kein Werk
          const m = /^(\w+)\((\d+)\)$/.exec(btn.getAttribute('onclick') || '');
          if (!m) continue;
          const kind = fnToKind[m[1]];
          if (!kind) continue; // selectTab u. Ä.
          const piece = window.arrayOf(kind)[Number(m[2])];
          if (!piece) continue;
          keys.push(`${piece.titleArabic ?? ''}|${window.displayTitle(piece)}`);
        }
        out[term] = keys.sort();
      }
      window.updateSearch('');
      return out;
    }, terms);
  } finally {
    await browser.close();
    server.close();
  }
}

/* ── Die neue App, über ihre API ────────────────────────────────────────── */

async function askApi(term) {
  const res = await fetch(`${API}/api/content/search?q=${encodeURIComponent(term)}`);
  if (!res.ok) throw new Error(`API ${res.status} für „${term}"`);
  const body = await res.json();
  return body.works
    .map((w) => `${w.work.titles.ar ?? ''}|${w.work.titles.en ?? ''}`)
    .sort();
}

/* ── Vergleich ──────────────────────────────────────────────────────────── */

const diff = (a, b) => a.filter((x) => !b.includes(x));

const legacy = await askLegacy(TERMS);

let bad = 0;
for (const term of TERMS) {
  const oldSet = legacy[term];
  const newSet = await askApi(term);
  const missing = diff(oldSet, newSet); // alt findet, neu nicht — ein VERLUST
  const extra = diff(newSet, oldSet); // neu findet, alt nicht
  const ok = missing.length === 0 && extra.length === 0;
  if (!ok) bad++;
  console.log(
    `${ok ? '✓' : '✗'} ${term.padEnd(18)} alt ${String(oldSet.length).padStart(3)} · neu ${String(newSet.length).padStart(3)}` +
      (missing.length ? `  verloren: ${missing.slice(0, 3).join(' — ')}` : '') +
      (extra.length ? `  hinzu: ${extra.slice(0, 3).join(' — ')}` : ''),
  );
}

console.log('');
console.log(
  bad === 0
    ? `Suchgleichstand: alle ${TERMS.length} Begriffe liefern dieselben Werke.`
    : `${bad} von ${TERMS.length} Begriffen weichen ab.`,
);
process.exit(bad === 0 ? 0 : 1);
