#!/usr/bin/env node
/* Extracts every content array out of the legacy single-file app (index.html)
   and writes them to JSON. This is the bridge between the old app and the
   database: run it once to seed, and again whenever the legacy file changes.

   The arrays are plain object literals inside a 15k-line <script> that also
   touches the DOM on load, so we cannot simply execute the file. Instead we
   slice out only the declarations we want, by line range, and evaluate those
   in an isolated vm context with nothing else in scope. That keeps the
   extraction honest: if a declaration moves or is renamed, this fails loudly
   rather than silently emitting stale data.

   Usage: node tools/extract-content.mjs [path/to/index.html] [outDir]  */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const SRC = process.argv[2] || path.join(process.cwd(), 'index.html');
const OUT = process.argv[3] || path.join(process.cwd(), 'data', 'extracted');

/* The declarations we lift out. Arrays of content, plus the small constants
   that carry ordering and scheduling — those matter as much as the verses,
   because today they live in array *positions* rather than in the data. */
const WANTED = [
  'QASIDAS', 'DALAIL_CHAPTERS', 'DIYA_CHAPTERS', 'BARZANJI_CHAPTERS',
  'NASHEED_CHAPTERS', 'LITANY_CHAPTERS', 'BURDAH_CHAPTERS', 'SIRAH_CHAPTERS',
  'ILAHI_CHAPTERS',
  'HOME_CARDS', 'TABS', 'TAB_CHILDREN', 'MAWLID_COLLECTIONS', 'PRAISE_SECTIONS',
  'OPENERS', 'DALAIL_DAYS', 'DALAIL_ROWS', 'DALAIL_TODAY_IDX',
  'AZAM_DAYS', 'AZAM_TODAY_IDX', 'AZAM_FIRST',
  'ISTIGHFAR_DAYS', 'ISTIGHFAR_TODAY_IDX', 'ISTIGHFAR_FIRST',
  'DALAIL_AUDIO', 'RECITERS', 'AUDIO_BASE', 'APP_VERSION',
];

function scriptBody(html) {
  const open = html.indexOf('<script>');
  const close = html.lastIndexOf('</script>');
  if (open < 0 || close < 0) throw new Error('No <script> block found in ' + SRC);
  return html.slice(open + '<script>'.length, close);
}

/* Finds `const NAME = …;` at column 0 and returns the source of that one
   declaration, by balancing brackets from the first opener. Balancing rather
   than looking for a closing line: several arrays contain lines that begin
   with `];` inside template literals. */
function sliceDecl(src, name) {
  const re = new RegExp('^const\\s+' + name + '\\s*=\\s*', 'm');
  const m = re.exec(src);
  if (!m) return null;
  const start = m.index;
  let i = m.index + m[0].length;
  const opener = src[i];
  if (opener !== '[' && opener !== '{') {
    /* A scalar such as APP_VERSION or AUDIO_BASE: take to end of statement. */
    const end = src.indexOf('\n', i);
    return src.slice(start, end < 0 ? src.length : end);
  }
  const closer = opener === '[' ? ']' : '}';
  let depth = 0, inStr = null, esc = false;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (esc) { esc = false; continue; }
    if (inStr) {
      if (ch === '\\') esc = true;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === opener) depth++;
    else if (ch === closer) { depth--; if (depth === 0) return src.slice(start, i + 1) + ';'; }
  }
  throw new Error('Unbalanced declaration: ' + name);
}

const html = fs.readFileSync(SRC, 'utf8');
const body = scriptBody(html);

const parts = [];
const missing = [];
for (const name of WANTED) {
  const decl = sliceDecl(body, name);
  if (decl) parts.push(decl); else missing.push(name);
}
if (missing.length) {
  console.error('WARNING: declarations not found (renamed or removed?): ' + missing.join(', '));
}

const found = WANTED.filter(n => !missing.includes(n));
const ctx = Object.create(null);
vm.createContext(ctx);
vm.runInContext(parts.join('\n') + '\n;globalThis.__OUT = {' + found.join(',') + '};', ctx);

fs.mkdirSync(OUT, { recursive: true });
const data = ctx.__OUT;
for (const [name, value] of Object.entries(data)) {
  const file = path.join(OUT, name.toLowerCase().replace(/_/g, '-') + '.json');
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
fs.writeFileSync(path.join(OUT, '_all.json'), JSON.stringify(data, null, 2) + '\n');

/* A manifest, so a reviewer can see at a glance what came across and spot a
   collection that silently emptied. */
const manifest = Object.fromEntries(Object.entries(data).map(([name, v]) => {
  if (!Array.isArray(v)) return [name, { type: typeof v }];
  return [name, {
    type: 'array',
    items: v.length,
    verses: v.reduce((a, o) => a + (Array.isArray(o?.verses) ? o.verses.length : 0), 0),
    fields: [...new Set(v.flatMap(o => Object.keys(o || {})))].sort(),
    verseFields: [...new Set(v.flatMap(o => (Array.isArray(o?.verses) ? o.verses.flatMap(x => Object.keys(x || {})) : [])))].sort(),
  }];
}));
fs.writeFileSync(path.join(OUT, '_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

/* Content arrays vs. navigation constants: both are extracted, but only the
   first are pieces of text. Reporting one total for both would flatter the
   figure — HOME_CARDS and the weekday tables are structure, not content. */
const CONTENT = [
  'QASIDAS', 'DALAIL_CHAPTERS', 'DIYA_CHAPTERS', 'BARZANJI_CHAPTERS',
  'NASHEED_CHAPTERS', 'LITANY_CHAPTERS', 'BURDAH_CHAPTERS', 'SIRAH_CHAPTERS',
  'ILAHI_CHAPTERS',
];
const sum = (names, field) => names.reduce((a, n) => a + (manifest[n]?.[field] || 0), 0);
const other = Object.keys(manifest).filter(n => manifest[n].type === 'array' && !CONTENT.includes(n));

console.log(`Extracted ${Object.keys(data).length} declarations → ${OUT}`);
console.log(`  content : ${sum(CONTENT, 'items')} works, ${sum(CONTENT, 'verses')} verses`);
console.log(`  nav     : ${sum(other, 'items')} entries across ${other.length} constants`);

/* An empty content array is almost always a mistake in the making, so say so
   rather than letting a silent zero pass into the seed. */
for (const name of CONTENT) {
  const m = manifest[name];
  if (m && m.items === 0) console.error(`NOTE: ${name} is empty.`);
  else if (m && m.verses === 0) console.error(`NOTE: ${name} has ${m.items} items but no verses.`);
}
