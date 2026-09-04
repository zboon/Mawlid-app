#!/usr/bin/env node
/* Bildet die flachen Arrays aus data/extracted/ auf die Struktur von
   db/schema.sql ab und schreibt das Ergebnis nach db/seed/.

   Der Textinhalt wird dabei NICHT angefasst. Kein trim(), keine
   Unicode-Normalisierung, kein Zusammenziehen von Leerzeichen, kein
   "Aufräumen" von Satzzeichen. Die einzige berechnete Ableitung ist
   body_search, und die steht in einer anderen Spalte.

   Die eigentliche Arbeit ist nicht das Umkopieren, sondern das Auflösen
   dessen, was in der Vorlage implizit ist:
     · die Lesereihenfolge des Mawlid, die als Zahl im englischen Titel steckt
     · die drei Wochenpläne, die auf Array-Positionen zeigen
     · die drei festen Textspalten ar/tr/en, in denen kein Deutsch Platz hat
     · sieben Vers-Flags, von denen drei in Wahrheit ein Typ sind

   Usage: node tools/build-seed.mjs [inDir] [outDir] */

import fs from 'node:fs';
import path from 'node:path';
import { normalizeArabic } from './lib/normalize.mjs';

const IN = process.argv[2] || 'data/extracted';
const OUT = process.argv[3] || 'db/seed';

const D = JSON.parse(fs.readFileSync(path.join(IN, '_all.json'), 'utf8'));

/* ── Hilfsmittel ────────────────────────────────────────────────────────── */

/* Ordnung, die in einer Zeichenkette steckt: "13 · Yā Nabī…" heißt Position 13,
   "13b · …" heißt 13,5 — eine Einfügung zwischen zwei Nummern des gedruckten
   Buches. Ohne Nummer gehört das Stück nicht zum Mawlid. */
const SECTION_RE = /^(\d+)(b?)\s*·\s*(.*)$/;
const sectionOf = (title) => {
  const m = SECTION_RE.exec(title || '');
  return m ? { num: +m[1] + (m[2] ? 0.5 : 0), label: m[1] + m[2], rest: m[3] } : null;
};

const usedSlugs = new Set();
function slug(text) {
  const base =
    String(text)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[ʿʾʼ']/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 140) || 'stueck';
  /* Ab jetzt ist der Slug stabil. Er wird nie wieder aus dem Titel neu
     erzeugt — sonst ändert eine Titelkorrektur die URL. */
  let s = base;
  for (let n = 2; usedSlugs.has(s); n++) s = `${base}-${n}`;
  usedSlugs.add(s);
  return s;
}

/* ── Ausgabepuffer ──────────────────────────────────────────────────────── */

const out = {
  modules: [],
  module_translations: [],
  collections: [],
  collection_translations: [],
  works: [],
  work_translations: [],
  verses: [],
  verse_texts: [],
  folios: [],
  media: [],
  reciters: [],
  schedules: [],
  schedule_slots: [],
  sequences: [],
  sequence_items: [],
  text_annotations: [],
  text_annotation_translations: [],
};

let moduleId = 0,
  collectionId = 0,
  workId = 0,
  verseId = 0,
  verseTextId = 0,
  folioId = 0,
  mediaId = 0,
  reciterId = 0,
  scheduleId = 0,
  slotId = 0,
  sequenceId = 0,
  seqItemId = 0,
  annotationId = 0;

function addModule({ slug: s, viewType, sortOrder, published, titles, descriptions }) {
  const id = ++moduleId;
  out.modules.push({
    id,
    slug: s,
    view_type: viewType,
    sort_order: sortOrder,
    is_published: published ? 1 : 0,
  });
  for (const [lang, title] of Object.entries(titles)) {
    out.module_translations.push({
      module_id: id,
      lang,
      title,
      description: descriptions?.[lang] ?? null,
    });
  }
  return id;
}

function addCollection({ module_id, slug: s, sortOrder, published, titles, descriptions }) {
  const id = ++collectionId;
  out.collections.push({
    id,
    module_id,
    parent_id: null,
    slug: s,
    sort_order: sortOrder,
    is_published: published ? 1 : 0,
    content_version: 1,
  });
  for (const [lang, title] of Object.entries(titles)) {
    out.collection_translations.push({
      collection_id: id,
      lang,
      title,
      description: descriptions?.[lang] ?? null,
    });
  }
  return id;
}

/* ── Ein Stück wird ein Werk ────────────────────────────────────────────── */

function addWork(piece, collection_id, sortOrder) {
  const sec = sectionOf(piece.titleEnglish);
  const titleEn = sec ? sec.rest : piece.titleEnglish || '';
  const latin = piece.latin === true;

  const id = ++workId;
  const verses = Array.isArray(piece.verses) ? piece.verses : [];

  out.works.push({
    id,
    collection_id,
    slug: slug(titleEn || piece.titleArabic || `werk-${id}`),
    sort_order: sortOrder,
    cartouche: piece.cartouche ?? null,
    /* Ersetzt das Flag `latin: true`, mit dem türkische Ilahis ihren
       lateinischen Originaltext im Feld `ar` unterbrachten. */
    primary_script: latin ? 'latn' : 'arab',
    primary_lang: latin ? 'tr' : 'ar',
    has_folios: Array.isArray(piece.folios) && piece.folios.length > 0 ? 1 : 0,
    /* Auch ein Werk ohne Verse wird veröffentlicht — so macht es die Vorlage:
       die 16 leeren Barzanjī-Kapitel stehen dort im Index und öffnen eine
       Platzhalterseite. Damit stimmen auch die Zählungen („17 Kapitel").
       Das war offene Frage 1/7 in docs/architecture/07-migration.md; die
       Vorgabe „alles wie das Original" hat sie entschieden. Wer leere
       Kapitel verbergen will, setzt sie per UPDATE auf 'draft' zurück —
       die API blendet Entwürfe von selbst aus. */
    status: 'published',
  });

  if (piece.titleArabic) {
    out.work_translations.push({
      work_id: id,
      lang: 'ar',
      title: piece.titleArabic,
      note: null,
      title_search: normalizeArabic(piece.titleArabic),
    });
  }
  if (titleEn) {
    out.work_translations.push({
      work_id: id,
      lang: 'en',
      title: titleEn,
      note: piece.note ?? null,
      title_search: normalizeArabic(titleEn),
    });
  }

  verses.forEach((v, position) => addVerse(v, id, position, latin));

  (piece.folios || []).forEach((f, i) => {
    out.folios.push({
      id: ++folioId,
      work_id: id,
      position: i,
      verse_from: f.from,
      verse_to: f.to,
      has_sections: f.sections ? 1 : 0,
      band_label: f.band ?? null,
    });
  });

  if (piece.video) {
    out.media.push({
      id: ++mediaId,
      work_id: id,
      kind: 'video',
      provider: 'youtube',
      url: piece.video,
      start_seconds: piece.videoStart ?? null,
      end_seconds: piece.videoEnd ?? null,
      duration_seconds: null,
      reciter_id: null,
      label: null,
      sort_order: 0,
    });
  }
  if (piece.video2) {
    out.media.push({
      id: ++mediaId,
      work_id: id,
      kind: 'video',
      provider: 'youtube',
      url: piece.video2,
      start_seconds: null,
      end_seconds: null,
      duration_seconds: null,
      reciter_id: null,
      label: 'Alternative Version',
      sort_order: 1,
    });
  }

  return id;
}

function addVerse(v, work_id, position, latin) {
  /* refrain und instruction schließen sich aus. Kommt in den Daten nicht
     gemeinsam vor — sollte es doch auftauchen, wird abgebrochen statt geraten. */
  if (v.refrain && v.instruction) {
    throw new Error(`Vers ${work_id}:${position} ist refrain UND instruction — bitte klären.`);
  }
  const kind = v.instruction ? 'instruction' : v.refrain ? 'refrain' : 'verse';

  const id = ++verseId;
  out.verses.push({
    id,
    work_id,
    position,
    verse_kind: kind,
    band_label: v.band ?? null,
    note_label: v.note ?? null,
    separator_mark: v.sep ?? null,
    no_rosette: v.noRosette ? 1 : 0,
    short_page: v.shortPage ? 1 : 0,
  });

  const push = (lang, role, script, body) => {
    /* Leere Zeichenketten werden NICHT als Zeile angelegt: sonst kann das
       Admin-Formular später nicht mehr zwischen "nicht übersetzt" und
       "absichtlich leer" unterscheiden. */
    if (typeof body !== 'string' || body === '') return;
    out.verse_texts.push({
      id: ++verseTextId,
      verse_id: id,
      lang,
      role,
      script,
      body,
      /* EINE Faltung für alle Sprachen, genau wie in der Vorlage.
         Die Faltung ist selbstkonsistent: eine deutsche Anfrage und ein
         deutscher Text falten identisch und treffen sich. Sie kostet
         Präzision (Wüste und Uste fallen zusammen), nicht Richtigkeit —
         und Präzision gegen Unschärfe zu tauschen ist der ganze Zweck
         dieser Suche. Trennte man nach Sprachen, fände ein Tippfehler die
         englische Übersetzung nicht mehr. Siehe 05-database.md §6. */
      body_search: normalizeArabic(body),
    });
  };

  /* Das Feld heißt `ar`, enthält bei den Ilahis aber Türkisch in lateinischer
     Schrift. Genau diese Verwechslung löst das neue Modell auf. */
  if (latin) push('tr', 'original', 'latn', v.ar);
  else push('ar', 'original', 'arab', v.ar);

  /* `tr` ist die UMSCHRIFT des Arabischen, nicht Türkisch. */
  push('ar', 'transliteration', 'latn', v.tr);
  push('en', 'translation', 'latn', v.en);
}

/* ── Module und Sammlungen ──────────────────────────────────────────────── */

const mDalail = addModule({
  slug: 'dalail',
  viewType: 'recitation',
  sortOrder: 10,
  published: true,
  titles: { ar: 'دَلَائِلُ الْخَيْرَاتِ', en: 'Dalāʾil al-Khayrāt', de: 'Dalāʾil al-Khayrāt' },
  descriptions: {
    en: "Imam al-Jazūlī's book of blessings upon the Prophet ﷺ, divided for the week.",
    de: 'Das Segensbuch des Imām al-Jazūlī über den Propheten ﷺ, auf die Woche verteilt.',
  },
});

const mMawlid = addModule({
  slug: 'mawlid',
  viewType: 'recitation',
  sortOrder: 20,
  published: true,
  titles: { ar: 'مَجْمُوعَاتُ الْمَوَالِدِ', en: 'Mawlid Collections', de: 'Mawlid' },
  descriptions: {
    en: 'The mawlid texts and Qasida Burdah — choose a collection to recite from.',
    de: 'Die Mawlid-Texte und die Qaṣīda Burda — eine Sammlung zum Rezitieren wählen.',
  },
});

const mPraises = addModule({
  slug: 'praises',
  viewType: 'recitation',
  sortOrder: 30,
  published: true,
  titles: { ar: 'الْأَنَاشِيدُ وَالْقَصَائِدُ', en: 'Nasheeds & Qasidas', de: 'Nasheeds & Qasidas' },
  descriptions: {
    en: 'Nasheeds, qasidas, ilahis and qawwalis.',
    de: 'Nasheeds, Qasidas, Ilahis und Qawwalis.',
  },
});

/* Al-Aḥzāb bekommt ein eigenes Modul. In der alten App war der Bereich von
   nirgendwo aus erreichbar — 18 Kapitel mit 950 Versen, 38 % des Bestandes. */
const mAhzab = addModule({
  slug: 'ahzab',
  viewType: 'recitation',
  sortOrder: 40,
  published: true,
  titles: { ar: 'الْأَحْزَابُ', en: 'Al-Aḥzāb', de: 'Al-Aḥzāb' },
  descriptions: {
    en: 'The daily litanies.',
    de: 'Die täglichen Litaneien.',
  },
});

/* Die vier neuen Bereiche aus der Skizze. Struktur steht, Inhalt fehlt —
   deshalb unveröffentlicht. */
for (const [i, m] of [
  ['silsila', 'tree', { ar: 'السِّلْسِلَة', en: 'Silsila', de: 'Silsila' }],
  ['sohbets', 'article', { ar: 'الصُّحْبَة', en: 'Sohbets', de: 'Sohbets' }],
  ['ottoman', 'article', { ar: 'الْعُثْمَانِيَّة', en: 'Ottoman', de: 'Osmanisch' }],
  ['wiki', 'wiki', { ar: 'الْمَعْرِفَة', en: 'Wiki', de: 'Wiki' }],
].entries()) {
  addModule({
    slug: m[0],
    viewType: m[1],
    sortOrder: 50 + i * 10,
    published: false,
    titles: m[2],
  });
}

/* ── Dalāʾil ────────────────────────────────────────────────────────────── */

const cDalailParts = addCollection({
  module_id: mDalail,
  slug: 'wochenteile',
  sortOrder: 10,
  published: true,
  titles: { ar: 'الْأَحْزَابُ الْيَوْمِيَّةُ', en: 'The daily portions', de: 'Die Wochenteile' },
});

/* Die Werk-Id je Quell-Index, damit die Wochenpläne später aufgelöst werden
   können, ohne noch einmal zu raten. */
const dalailWorkByIdx = new Map();
D.DALAIL_CHAPTERS.forEach((c, i) => {
  dalailWorkByIdx.set(i, addWork(c, cDalailParts, i));
});

/* ── Mawlid ─────────────────────────────────────────────────────────────── */

const cDaybai = addCollection({
  module_id: mMawlid,
  slug: 'daybai',
  sortOrder: 10,
  published: true,
  titles: { ar: 'مَوْلِدُ الدَّيْبَعِيِّ', en: 'Mawlid ad-Daybaʿi', de: 'Mawlid ad-Daybaʿī' },
  descriptions: {
    en: (D.MAWLID_COLLECTIONS.find((c) => c.id === 'mawlid') || {}).desc ?? null,
  },
});
const cBarzanji = addCollection({
  module_id: mMawlid,
  slug: 'barzanji',
  sortOrder: 20,
  published: true,
  titles: { ar: 'مَوْلِدُ الْبَرْزَنْجِيِّ', en: 'Mawlid al-Barzanjī', de: 'Mawlid al-Barzanjī' },
  descriptions: {
    en: (D.MAWLID_COLLECTIONS.find((c) => c.id === 'barzanji') || {}).desc ?? null,
  },
});
const cDiya = addCollection({
  module_id: mMawlid,
  slug: 'diya',
  sortOrder: 30,
  published: true,
  titles: { ar: 'الضِّيَاءُ اللَّامِعُ', en: 'The Shimmering Light', de: 'Das leuchtende Licht' },
  descriptions: {
    en: (D.MAWLID_COLLECTIONS.find((c) => c.id === 'diya') || {}).desc ?? null,
  },
});
const cBurdah = addCollection({
  module_id: mMawlid,
  slug: 'burdah',
  sortOrder: 40,
  published: true,
  titles: { ar: 'قَصِيدَةُ الْبُرْدَةِ', en: 'Qasida Burdah', de: 'Qaṣīda Burda' },
  descriptions: {
    en: (D.MAWLID_COLLECTIONS.find((c) => c.id === 'burdah') || {}).desc ?? null,
  },
});

/* Der Mawlid ad-Daybaʿī wird als EINE Folge gelesen, die aus ZWEI Quellarrays
   verschränkt ist. Die Ordnung steckt als Zahl im englischen Titel; Stücke
   ohne Zahl gehören nicht dazu. */
const mawlidItems = [];
D.QASIDAS.forEach((q, i) => {
  const sec = sectionOf(q.titleEnglish);
  if (sec) mawlidItems.push({ sec, piece: q, src: `QASIDAS[${i}]` });
});
D.SIRAH_CHAPTERS.forEach((c, i) => {
  const sec = sectionOf(c.titleEnglish);
  if (sec) mawlidItems.push({ sec, piece: c, src: `SIRAH_CHAPTERS[${i}]` });
});
mawlidItems.sort((a, b) => a.sec.num - b.sec.num);

const seqDaybai = ++sequenceId;
out.sequences.push({ id: seqDaybai, collection_id: cDaybai, slug: 'lesereihenfolge' });

mawlidItems.forEach((it, n) => {
  const id = addWork(it.piece, cDaybai, n);
  out.sequence_items.push({
    id: ++seqItemId,
    sequence_id: seqDaybai,
    work_id: id,
    /* Lückenlos ab 1 — das ist die Zahl, die auf der Karte steht. */
    ordinal: n + 1,
    /* Die Nummer der Vorlage bleibt erhalten, sonst geht beim Einfügen eines
       fehlenden Abschnitts die Zuordnung zum gedruckten Buch verloren. */
    source_label: it.sec.label,
  });
});

D.BARZANJI_CHAPTERS.forEach((c, i) => addWork(c, cBarzanji, i));
D.DIYA_CHAPTERS.forEach((c, i) => addWork(c, cDiya, i));
D.BURDAH_CHAPTERS.forEach((c, i) => addWork(c, cBurdah, i));

/* ── Nasheeds & Qasidas ─────────────────────────────────────────────────── */

const cQasidas = addCollection({
  module_id: mPraises,
  slug: 'qasidas',
  sortOrder: 10,
  published: true,
  titles: { ar: 'قَصَائِدُ', en: 'Qasidas', de: 'Qasidas' },
  descriptions: {
    en: (D.PRAISE_SECTIONS.find((c) => c.id === 'qasidas') || {}).desc ?? null,
  },
});
const cIlahis = addCollection({
  module_id: mPraises,
  slug: 'ilahis',
  sortOrder: 20,
  published: true,
  titles: { ar: 'الْإِلٰهِيَّاتُ', en: 'Ilahis', de: 'Ilahis' },
  descriptions: {
    en: (D.PRAISE_SECTIONS.find((c) => c.id === 'ilahis') || {}).desc ?? null,
  },
});
/* Beide leeren Bereiche erscheinen wie in der Vorlage als „Demnächst"-Kacheln
   — die Struktur ist sichtbar, der Inhalt kommt später. */
const cNasheeds = addCollection({
  module_id: mPraises,
  slug: 'nasheeds',
  sortOrder: 30,
  published: true,
  titles: { ar: 'أَنَاشِيدُ', en: 'Nasheeds', de: 'Nasheeds' },
  descriptions: {
    en: (D.PRAISE_SECTIONS.find((c) => c.id === 'nasheeds') || {}).desc ?? null,
  },
});
addCollection({
  module_id: mPraises,
  slug: 'qawwalis',
  sortOrder: 40,
  published: true,
  titles: { ar: 'قَوَالِي', en: 'Qawwalis', de: 'Qawwalis' },
  descriptions: {
    en: (D.PRAISE_SECTIONS.find((c) => c.id === 'qawwalis') || {}).desc ?? null,
  },
});

/* Qasidas OHNE Nummer gehören nicht zum Mawlid und bilden die eigene Sammlung. */
D.QASIDAS.filter((q) => q.group === 'qasidas' && !sectionOf(q.titleEnglish)).forEach((q, i) =>
  addWork(q, cQasidas, i),
);
D.ILAHI_CHAPTERS.forEach((c, i) => addWork(c, cIlahis, i));
D.NASHEED_CHAPTERS.forEach((c, i) => addWork(c, cNasheeds, i));

/* ── Al-Aḥzāb ───────────────────────────────────────────────────────────── */

/* LITANY_CHAPTERS[2] und [3] tragen nur Namen und haben keine Verse. Sie sind
   in Wahrheit Überschriften ihrer Wochengruppen — also Sammlungen, keine
   Werke. Genau dafür existieren AZAM_TITLE_IDX und ISTIGHFAR_TITLE_IDX in der
   alten App: um deren Namen auszulesen. */
const AZAM_TITLE_IDX = 3;
const ISTIGHFAR_TITLE_IDX = 2;
const titleOf = (i) => D.LITANY_CHAPTERS[i] || {};

/* Reihenfolge wie in der Vorlage: die Litanei-Liste zeigt erst die beiden
   einzelnen Aḥzāb (LITANY_CHAPTERS[0] und [1]), dann die zwei Wochenbücher.
   Die sortOrder-Werte bilden genau das ab. */
const cAzam = addCollection({
  module_id: mAhzab,
  slug: 'azam',
  sortOrder: 20,
  published: true,
  titles: {
    ar: titleOf(AZAM_TITLE_IDX).titleArabic || 'الْحِزْبُ الْأَعْظَمُ',
    en: titleOf(AZAM_TITLE_IDX).titleEnglish || 'Al-Ḥizb al-Aʿẓam',
  },
});
const cIstighfar = addCollection({
  module_id: mAhzab,
  slug: 'istighfar',
  sortOrder: 30,
  published: true,
  titles: {
    ar: titleOf(ISTIGHFAR_TITLE_IDX).titleArabic || 'حِزْبُ الْاِسْتِغْفَارِ',
    en: titleOf(ISTIGHFAR_TITLE_IDX).titleEnglish || 'Ḥizb al-Istighfār',
  },
});
const cSingle = addCollection({
  module_id: mAhzab,
  slug: 'einzelne',
  sortOrder: 10,
  published: true,
  titles: { ar: 'أَحْزَابٌ مُفْرَدَةٌ', en: 'Single litanies', de: 'Einzelne Litaneien' },
});

const AZAM_FIRST = D.AZAM_FIRST;
const ISTIGHFAR_FIRST = D.ISTIGHFAR_FIRST;
const isAzam = (n) => n >= AZAM_FIRST && n <= AZAM_FIRST + 6;
const isIstighfar = (n) => n >= ISTIGHFAR_FIRST && n <= ISTIGHFAR_FIRST + 6;

const litanyWorkByIdx = new Map();
D.LITANY_CHAPTERS.forEach((c, i) => {
  if (i === AZAM_TITLE_IDX || i === ISTIGHFAR_TITLE_IDX) return; // wurden Sammlungen
  const target = isAzam(i) ? cAzam : isIstighfar(i) ? cIstighfar : cSingle;
  litanyWorkByIdx.set(i, addWork(c, target, i));
});

/* ── Wochenpläne ────────────────────────────────────────────────────────── */

/* Das Herzstück der Migration. In der Vorlage bilden drei Objekte einen
   Wochentag auf eine ARRAY-POSITION ab; wird irgendwo ein Kapitel eingefügt,
   zeigt die App am Dienstag den Mittwochsteil, ohne Fehlermeldung. Hier wird
   daraus ein echter Fremdschlüssel. */
function addSchedule(collection_id, slugName, map, workByIdx) {
  const id = ++scheduleId;
  out.schedules.push({ id, collection_id, slug: slugName, cycle: 'weekly' });
  const perDay = new Map();
  for (const [weekday, idx] of Object.entries(map)) {
    const work_id = workByIdx.get(Number(idx));
    if (!work_id) throw new Error(`${slugName}: Index ${idx} hat kein Werk.`);
    const wd = Number(weekday);
    const slot = perDay.get(wd) ?? 0;
    perDay.set(wd, slot + 1);
    out.schedule_slots.push({ id: ++slotId, schedule_id: id, weekday: wd, slot_index: slot, work_id });
  }
  return id;
}

const dalailScheduleId = addSchedule(
  cDalailParts, 'wochenteile', D.DALAIL_TODAY_IDX, dalailWorkByIdx,
);
addSchedule(cAzam, 'azam-woche', D.AZAM_TODAY_IDX, litanyWorkByIdx);
addSchedule(cIstighfar, 'istighfar-woche', D.ISTIGHFAR_TODAY_IDX, litanyWorkByIdx);

/* Die zweiten Tagesteile — heute nur „Montag, Teil 2". DALAIL_TODAY_IDX kennt
   je Tag EINEN Zeiger (der bleibt Platz 0, daran hängt die Heute-Karte);
   DALAIL_DAYS führt zusätzlich die Rasterplätze, und dort steht der zweite
   Montagsteil als „Mon ²". Genau dafür hat schedule_slots den slot_index. */
const DAY_SHORT_TO_WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
for (const day of D.DALAIL_DAYS) {
  const m = /^([A-Za-z]+) ([\u00b2\u00b3])$/.exec(day.en);
  if (!m) continue;
  const weekday = DAY_SHORT_TO_WEEKDAY[m[1]];
  const part = m[2] === '\u00b2' ? 1 : 2; // slot_index: ² -> 1, ³ -> 2
  const work_id = dalailWorkByIdx.get(day.idx);
  if (weekday === undefined || !work_id) {
    throw new Error(`DALAIL_DAYS: '${day.en}' (Index ${day.idx}) ist kein zweiter Tagesteil.`);
  }
  out.schedule_slots.push({
    id: ++slotId, schedule_id: dalailScheduleId, weekday, slot_index: part, work_id,
  });
}

/* ── Rezitatoren und Aufnahmen ──────────────────────────────────────────── */

const reciterIdBySlug = new Map();
for (const [s, r] of Object.entries(D.RECITERS)) {
  const id = ++reciterId;
  reciterIdBySlug.set(s, id);
  out.reciters.push({ id, slug: s, name_ar: r.ar ?? null, name_latin: r.en });
}

for (const [idx, recs] of Object.entries(D.DALAIL_AUDIO)) {
  const work_id = dalailWorkByIdx.get(Number(idx));
  if (!work_id) throw new Error(`DALAIL_AUDIO: Index ${idx} hat kein Werk.`);
  recs.forEach((rec, i) => {
    out.media.push({
      id: ++mediaId,
      work_id,
      kind: 'audio',
      provider: 'file',
      url: D.AUDIO_BASE + rec.file,
      start_seconds: null,
      end_seconds: null,
      /* Dateigrößen werden bewusst nicht gespeichert: die Kopien auf dem
         Server tragen ein zusätzliches Metadaten-Atom, jede hier notierte
         Zahl würde driften. content-length wird beim Laden gelesen. */
      duration_seconds: rec.secs ?? null,
      reciter_id: reciterIdBySlug.get(rec.reciter) ?? null,
      label: null,
      sort_order: i,
    });
  });
}

/* ── Redaktionelle Glossen ──────────────────────────────────────────────── */

/* INLINE_INSTRUCTIONS aus der alten App: Such-und-Ersetz-Regeln, die beim
   Rendern bestimmte Stellen in goldene Tinte hüllen und nachbilden, was das
   gedruckte Buch farbig setzt. Das ist Inhalt, kein Format — es verschwindet
   lautlos, wenn man es übersieht. */
const ANNOTATIONS = [
  { kind: 'regex', pattern: '\\((?:[0-9]+|[\\u0660-\\u0669]+)\\)', gloss: null },
  { kind: 'literal', pattern: '(٤ مرات)', gloss: null },
  { kind: 'literal', pattern: '(محل الْقيام)', gloss: null },
  { kind: 'literal', pattern: '(اَنِّي رَسُولُكَ فِي دُعَائِهِ ﷺ)', gloss: null },
  {
    kind: 'literal',
    pattern: 'وَفِي الصَّحِيحِ كَانَ اَكْثَرُ دُعَاءِ النَّبِيِّ صَلَّى اللّٰهُ تَعَالَى عَلَيْهِ وَسَلَّمَ',
    gloss: null,
  },
  { kind: 'literal', pattern: 'وَفِي نُسْخَةٍ اُخْرٰى', gloss: null },
  {
    kind: 'literal',
    pattern: '(فُلَانِ بْن فُلَانٍ)',
    gloss: {
      en: 'So-and-so, son of so-and-so — say your own name and your father’s name here.',
      de: 'So-und-so, Sohn von so-und-so — hier den eigenen Namen und den des Vaters sagen.',
    },
  },
];

ANNOTATIONS.forEach((a, i) => {
  const id = ++annotationId;
  out.text_annotations.push({
    id,
    match_kind: a.kind,
    pattern: a.pattern,
    style: 'gloss',
    work_id: null,
    is_active: 1,
    sort_order: i,
  });
  for (const [lang, gloss] of Object.entries(a.gloss || {})) {
    out.text_annotation_translations.push({ annotation_id: id, lang, gloss });
  }
});

/* ── Schreiben ──────────────────────────────────────────────────────────── */

fs.mkdirSync(OUT, { recursive: true });
for (const [table, rows] of Object.entries(out)) {
  fs.writeFileSync(path.join(OUT, `${table}.json`), JSON.stringify(rows, null, 1) + '\n');
}

const width = Math.max(...Object.keys(out).map((k) => k.length));
for (const [table, rows] of Object.entries(out)) {
  console.log(`  ${table.padEnd(width)} ${String(rows.length).padStart(6)}`);
}
console.log(`\nnach ${OUT}`);
