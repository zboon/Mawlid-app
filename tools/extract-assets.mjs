#!/usr/bin/env node
/* Lifts the base64 blobs out of the legacy index.html and writes them as real
   files. Three fonts (~623 KB decoded) and three calligraphy PNGs are inlined
   there, together about a third of the 2.4 MB file.

   As files they are cached by the browser on their own terms, do not block the
   first paint, and — the point that matters most here — no longer travel again
   with every content edit.

   The Uthmani font is copied byte for byte. Its licence permits use and
   redistribution but forbids modification, so no subsetting, no re-wrapping,
   no "optimising". See docs/design/02-typography.md.

   Usage: node tools/extract-assets.mjs [index.html] [outDir] */

import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2] || 'index.html';
const OUT = process.argv[3] || 'apps/web/public';

const html = fs.readFileSync(SRC, 'utf8');

/* Each font arrives as `src:url(data:font/<ext>;base64,<blob>)` inside an
   @font-face whose family we read back so the file is named after it. */
const FONT_RE = /@font-face\s*\{([^}]*?)src:\s*url\(data:font\/(\w+);base64,([A-Za-z0-9+/=]+)\)/g;

const written = [];
let m;
while ((m = FONT_RE.exec(html)) !== null) {
  const [, block, ext, b64] = m;
  const family = (/font-family:\s*['"]([^'"]+)['"]/.exec(block) || [])[1] || 'unknown';
  const weight = (/font-weight:\s*(\d+)/.exec(block) || [])[1] || '400';
  const name = `${family.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${weight}.${ext}`;
  const buf = Buffer.from(b64, 'base64');
  const dest = path.join(OUT, 'fonts', name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  written.push({ kind: 'font', name, bytes: buf.length, family, weight });
}

/* The calligraphy is held in named consts rather than in CSS. */
const IMG_CONSTS = ['LOGO_INNER', 'HEADER_BISMILLAH', 'BISMILLAH_MARK'];
for (const konst of IMG_CONSTS) {
  const re = new RegExp(`const ${konst}\\s*=\\s*'data:image/(\\w+);base64,([A-Za-z0-9+/=]+)'`);
  const hit = re.exec(html);
  if (!hit) { console.error(`WARNING: ${konst} not found`); continue; }
  const [, ext, b64] = hit;
  const buf = Buffer.from(b64, 'base64');
  const name = `${konst.toLowerCase().replace(/_/g, '-')}.${ext}`;
  const dest = path.join(OUT, 'img', name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  written.push({ kind: 'image', name, bytes: buf.length });
}

const total = written.reduce((a, w) => a + w.bytes, 0);
for (const w of written) {
  console.log(`  ${w.kind.padEnd(5)} ${w.name.padEnd(34)} ${(w.bytes / 1024).toFixed(0).padStart(5)} KB`);
}
console.log(`\n${written.length} files, ${(total / 1024).toFixed(0)} KB written to ${OUT}`);
console.log('Remember: OFL.txt and the KFGQPC licence must travel with these.');
