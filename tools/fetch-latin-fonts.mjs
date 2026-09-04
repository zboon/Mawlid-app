#!/usr/bin/env node
/* Fetches Crimson Pro and Karla from Google and writes them next to the Arabic
   faces, so the app has no third-party font request at runtime.

   Two reasons this is worth doing: the app is meant to run locally, and a
   call to Google's CDN on every page load is a data-protection conversation
   nobody needs to have.

   Only the latin and latin-ext subsets are kept — the app has no Cyrillic,
   Greek or Vietnamese text, and those three would triple the folder for
   nothing. Both are OFL, so redistribution is fine; the licence travels in
   public/fonts/LICENSES/.

   Usage: node tools/fetch-latin-fonts.mjs [outDir] */

import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] || 'apps/web/public/fonts';
const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400' +
  '&family=Karla:wght@400;500;600;700&display=swap';
/* Google serves woff2 only to browsers that ask like one. */
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const KEEP = new Set(['latin', 'latin-ext']);

const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();

/* Each block is preceded by a /* subset *​/ comment naming what it covers. */
const blocks = css.split('@font-face').slice(1);
let subset = null;
const out = [];
let kept = 0,
  skipped = 0;

/* The subset comments sit BETWEEN blocks, so walk the raw text in order. */
const parts = css.split(/(\/\*\s*[a-z-]+\s*\*\/)/);
let current = null;
for (const part of parts) {
  const label = /^\/\*\s*([a-z-]+)\s*\*\/$/.exec(part.trim());
  if (label) { current = label[1]; continue; }
  for (const face of part.split('@font-face').slice(1)) {
    subset = current;
    if (!KEEP.has(subset)) { skipped++; continue; }
    const family = /font-family:\s*'([^']+)'/.exec(face)?.[1];
    const weight = /font-weight:\s*(\d+)/.exec(face)?.[1] ?? '400';
    const style = /font-style:\s*(\w+)/.exec(face)?.[1] ?? 'normal';
    const url = /url\((https:[^)]+)\)/.exec(face)?.[1];
    const range = /unicode-range:\s*([^;]+);/.exec(face)?.[1]?.trim();
    if (!family || !url) continue;

    const slug = family.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const name = `${slug}-${weight}${style === 'italic' ? 'i' : ''}-${subset}.woff2`;
    const buf = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, name), buf);
    kept++;
    console.log(`  ${name.padEnd(34)} ${(buf.length / 1024).toFixed(1).padStart(6)} KB`);

    out.push(
      `@font-face {\n` +
        `  font-family: '${family}';\n` +
        `  font-style: ${style};\n` +
        `  font-weight: ${weight};\n` +
        `  font-display: swap;\n` +
        `  src: url('/fonts/${name}') format('woff2');\n` +
        (range ? `  unicode-range: ${range};\n` : '') +
        `}`
    );
  }
}

const header =
  `/* Erzeugt von tools/fetch-latin-fonts.mjs — nicht von Hand bearbeiten.\n` +
  `   Nur die Subsets latin und latin-ext; der Rest wird nicht gebraucht.\n` +
  `   Beide Familien stehen unter der SIL OFL 1.1, siehe LICENSES/. */\n\n`;
fs.writeFileSync(path.join(OUT, '..', '..', 'src', 'styles', 'fonts-latin.css'), header + out.join('\n\n') + '\n');

console.log(`\n${kept} Dateien geschrieben, ${skipped} andere Subsets übersprungen.`);
