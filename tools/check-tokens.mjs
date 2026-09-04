#!/usr/bin/env node
/* Prüft die eine Regel, an der das Design-System hängt:

     In Komponenten stehen nur Token-Namen. Keine literalen Farben,
     keine literalen Abstände.

   Ohne diese Prüfung ist die Regel eine Bitte. Mit ihr ist sie eine
   Bedingung — und eine Palettenänderung bleibt eine Änderung an einer Datei.

   Geprüft werden die <style>-Blöcke aller .vue-Dateien. tokens.css selbst ist
   ausgenommen: dort GEHÖREN die Werte hin.

   Usage: node tools/check-tokens.mjs [dir] */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || 'apps/web/src';

/* Literale Farben. Erlaubt bleiben currentColor, transparent und die
   Token-Verweise selbst. */
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const FN = /\b(?:rgba?|hsla?)\(\s*(?!from\s)[^)]*\)/g;

/* Abstände und Radien als literale Längen.
   Geprüft werden NUR die Eigenschaften, die die Dokumentation nennt: Abstand
   und Radius. Bauteilmaße (width, height, max-width) sind ausdrücklich nicht
   gemeint — die Größe eines Knopfes ist eine Eigenschaft dieses Knopfes und
   gehört in seine Komponente, nicht in die globale Skala. */
const LEN = /(?<![\w-])(\d*\.?\d+)(rem)(?![\w-])/g;

const CHECKED_PROPS = /^(?:padding|margin|gap|row-gap|column-gap|border-radius|inset)/;

const problems = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith('.vue')) check(p);
  }
}

function check(file) {
  const src = fs.readFileSync(file, 'utf8');
  const start = src.indexOf('<style');
  if (start < 0) return;
  const block = src.slice(src.indexOf('>', start) + 1, src.lastIndexOf('</style>'));
  const before = src.slice(0, src.indexOf('>', start) + 1).split('\n').length;

  block.split('\n').forEach((line, i) => {
    /* Kommentare überspringen — dort stehen Werte oft als Erläuterung. */
    const code = line.replace(/\/\*.*?\*\//g, '').split('/*')[0];
    if (!code.trim()) return;
    const lineNo = before + i;

    for (const re of [HEX, FN]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(code)) !== null) {
        problems.push({ file, lineNo, found: m[0], why: 'literale Farbe' });
      }
    }

    const prop = (code.match(/^\s*([a-z-]+)\s*:/) || [])[1] || '';
    if (!CHECKED_PROPS.test(prop)) return;
    LEN.lastIndex = 0;
    let m;
    while ((m = LEN.exec(code)) !== null) {
      problems.push({ file, lineNo, found: m[0], why: `literale Länge in ${prop || '?'}` });
    }
  });
}

walk(ROOT);

if (!problems.length) {
  console.log('Token-Prüfung: keine literalen Werte in Komponenten.');
  process.exit(0);
}

console.error(`Token-Prüfung: ${problems.length} literale Werte gefunden.\n`);
for (const p of problems) {
  console.error(`  ${p.file}:${p.lineNo}  ${p.found.padEnd(24)} ${p.why}`);
}
console.error('\nFehlt ein Wert, wird er ERST in docs/design/01-tokens.md eingetragen');
console.error('und dann in apps/web/src/styles/tokens.css umgesetzt — nicht in der Komponente.');
process.exit(1);
