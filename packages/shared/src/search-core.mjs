/* ============================================================================
   Suchkern — der Algorithmus der Vorlage, Zeichen für Zeichen.
   ----------------------------------------------------------------------------
   Drei Aufrufer: die API (GET /api/content/search), das Frontend (Segmente,
   Schnipsel) und die Gleichstandsprüfung unter tools/. Deshalb .mjs, wie
   normalize.mjs daneben; Typen in search-core.d.mts.

   Der Vergleich ist ein VIERFACH-ODER, und jede Stufe stammt wörtlich aus
   index.html (matchesQuery / verseHits):

     1. normalisiert          h.norm.includes(nq)
     2. gestrafft             tighten(h.norm).includes(tighten(nq))
     3. roh, kleingeschrieben h.raw.includes(q.toLowerCase().trim())
     4. arabisch wörtlich     h.ar.includes(q.trim())   — nur bei arabischer
                                                          Eingabe

   Wer hier eine Stufe „vereinfacht", verändert Treffermengen, die die
   Gleichstandsprüfung (40+ Begriffe alt gegen neu) sofort rot macht.

   Zwei leicht zu übersehende Treueregeln:
   - Der Heuhaufen eines Werkes ist EIN zusammengefügter String in fester
     Reihenfolge (Titel en, Titel ar, dann je Vers tr/en/ar). Die gestraffte
     Stufe entfernt Leerzeichen — dadurch kann eine Anfrage über die Naht
     zweier Teile hinweg treffen. Reihenfolge ändern heißt Treffer ändern.
   - Die Versprüfung fragt die Felder in der Reihenfolge en → tr → ar und
     nimmt das ERSTE treffende als Anzeigefeld, genau wie die Vorlage.
   ========================================================================= */

import { normalizeArabic, tighten } from './normalize.mjs';

/** Der Seitenumbruch ‖ der Buchansicht, samt umgebendem Weißraum, wird zu
    einem Leerzeichen — so zeigt die Vorlage Verstexte außerhalb des Buches. */
export const stripBreaks = (s) => String(s).replace(/\s*‖\s*/g, ' ').trim();

/* Als \uXXXX geschrieben, nicht als Zeichen: eine Zeichenklasse mit
   arabischen Literalen zeigt im Editor durch die Bidi-Darstellung eine
   andere Reihenfolge als sie hat (siehe isBasmala in apps/web). */
const AR_RE = /[\u0600-\u06ff]/;

/** Die Hervorhebungsabschnitte eines Verses: getrennt an jeder Rosette ۞
    (sie steht zwischen den Abschnitten) und an jedem arabischen Komma ،
    (es bleibt am Abschnitt). Leere Abschnitte entstehen nicht. */
export function segParts(s) {
  const out = [];
  let buf = '';
  const push = (t) => {
    if (buf.trim() !== '') out.push(buf + t);
    buf = '';
  };
  for (const ch of String(s)) {
    if (ch === '۞') push('');
    else if (ch === '،') push('،');
    else buf += ch;
  }
  push('');
  return out;
}

/** Die vier Formen einer Suchanfrage, einmal berechnet. */
export function queryForms(query) {
  const q = String(query ?? '');
  const nq = normalizeArabic(q);
  return {
    q,
    nq,
    tq: tighten(nq),
    rawq: q.toLowerCase().trim(),
    isAr: AR_RE.test(q),
  };
}

/** Der durchsuchbare Heuhaufen eines Werkes aus seinen Rohteilen.
    `parts` in der Reihenfolge der Vorlage: [titleEnglish, titleArabic,
    dann je Vers tr, en, ar] — fehlende Teile als undefined sind in
    Ordnung, join() setzt sie leer. */
export function buildHaystack(parts) {
  const joined = parts.join(' ');
  const norm = normalizeArabic(joined);
  return { norm, tight: tighten(norm), raw: joined.toLowerCase(), ar: joined };
}

/** Stufe 1–4 gegen einen vorbereiteten Heuhaufen. Leere Anfrage trifft
    alles — auch das ist Vorlagenverhalten (ein Leerzeichen im Suchfeld
    listet die ganze App). */
export function matchesHaystack(h, f) {
  if (!f.q) return true;
  if (f.nq && h.norm.includes(f.nq)) return true;
  if (f.tq && h.tight.includes(f.tq)) return true;
  if (h.raw.includes(f.rawq)) return true;
  if (f.isAr && h.ar.includes(f.q.trim())) return true;
  return false;
}

/** Dasselbe Vierfach-ODER gegen einen einzelnen Rohtext (ein Versfeld). */
export function testText(raw, f) {
  if (!raw) return false;
  const nf = normalizeArabic(raw);
  return (
    (f.nq !== '' && nf.includes(f.nq)) ||
    (f.tq !== '' && tighten(nf).includes(f.tq)) ||
    raw.toLowerCase().includes(f.rawq) ||
    (f.isAr && raw.includes(f.q.trim()))
  );
}

/** In welchem Hervorhebungsabschnitt des Verses der Treffer sitzt.
    Arabisch: exakt (normalisierter Abschnitt enthält die Anfrage).
    tr/en: nach Position — der Bruchteil der Fundstelle im Feld wird auf die
    Abschnittslängen des arabischen Textes umgerechnet. `v` trägt die ROHEN
    Felder {ar, tr, en}; das ‖ wird nur für die Abschnitte entfernt, die
    Positionsrechnung läuft wie in der Vorlage auf dem Rohfeld. */
export function hitSeg(v, field, f) {
  const ar = stripBreaks(v.ar || '');
  const segs = segParts(ar);
  if (segs.length <= 1) return 0;
  if (field === 'ar' || f.isAr) {
    for (let i = 0; i < segs.length; i++) {
      if (normalizeArabic(segs[i]).includes(f.nq)) return i;
    }
  }
  const raw = String(v[field] || '');
  const mi = raw.toLowerCase().indexOf(f.rawq);
  if (mi < 0) return 0;
  const frac = raw.length ? mi / raw.length : 0;
  const target = frac * segs.reduce((a, p) => a + p.length, 0);
  let cum = 0;
  for (let i = 0; i < segs.length; i++) {
    cum += segs[i].length;
    if (cum >= target) return i;
  }
  return segs.length - 1;
}

/** Die treffenden Verse eines Werkes: bis zu 40, je mit dem Anzeigefeld des
    ERSTEN Treffers (en → tr → ar). `verses` als [{ar, tr, en}] mit den rohen
    Texten in Vorlagenreihenfolge. Ergebnis je Treffer:
    { n, ar (ohne ‖), sec (Rohtext des Zweitfeldes, '' bei arabischem
    Treffer), field, seg }. */
export function verseHits(verses, f) {
  if (!f.q) return [];
  const out = [];
  for (let n = 0; n < verses.length; n++) {
    const v = verses[n];
    const ar = stripBreaks(v.ar || '');
    let field = null;
    if (testText(v.en, f)) field = 'en';
    else if (testText(v.tr, f)) field = 'tr';
    else if (testText(ar, f)) field = 'ar';
    if (!field) continue;
    out.push({
      n,
      ar,
      sec: field === 'ar' ? '' : v[field] || '',
      field,
      seg: hitSeg(v, field, f),
    });
    if (out.length >= 40) break;
  }
  return out;
}

/** Ein Fenster um die Fundstelle, als Daten statt HTML: {pre, match, post}.
    `match` ist leer, wenn der Treffer nur über die Normalisierung zustande
    kam — dann gibt es nichts wörtlich hervorzuheben und `pre` trägt den
    Textanfang (mit … gekürzt, wenn er länger als das Fenster ist). */
export function hitSnippet(text, query, win = 110) {
  const raw = String(text || '');
  if (!raw) return { pre: '', match: '', post: '' };
  let i = -1;
  let len = 0;
  const ql = String(query || '').toLowerCase().trim();
  if (ql) {
    i = raw.toLowerCase().indexOf(ql);
    if (i >= 0) len = ql.length;
  }
  if (i < 0 && AR_RE.test(String(query || ''))) {
    const qa = String(query).trim();
    i = raw.indexOf(qa);
    if (i >= 0) len = qa.length;
  }
  if (i < 0) {
    return {
      pre: raw.length > win ? raw.slice(0, win).trim() + '…' : raw,
      match: '',
      post: '',
    };
  }
  const half = Math.floor(win / 2);
  const a = Math.max(0, i - half);
  const b = Math.min(raw.length, i + len + half);
  return {
    pre: (a > 0 ? '…' : '') + raw.slice(a, i),
    match: raw.slice(i, i + len),
    post: raw.slice(i + len, b) + (b < raw.length ? '…' : ''),
  };
}
