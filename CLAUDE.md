# Mawalid — working notes for Claude

Read on every run, in the terminal, on the web and in GitHub Actions. Two people
work on this repository through Claude, and none of the conventions below are
guessable from the code.

**Read this whole file before editing any Arabic.** Most of it is the record of
mistakes already made once. The verification battery near the end is not
optional — several of these faults are invisible in a diff and only surface when
someone is reciting from the app in front of a congregation.

---

## What this is

An offline devotional PWA. One self-contained `index.html` — all HTML, CSS,
JavaScript and the whole Arabic corpus inline — plus a service worker, a
manifest and two icons. It installs to a phone's home screen and works with no
network.

**Two apps from the same source:**

| | | current |
|---|---|---|
| **Mawalid** (this repo) | the full collection | **v390** |
| **Dalāʾil al-Khayrāt** | a slimmer fork: Dalāʾil and the aḥzāb only | **v68** |

Deployed by GitHub Pages from `main`. **Anything merged is live within a
minute**, and people recite from it.

Audio lives in a second repo published to Pages (`zboon.github.io/mawlid-audio/`)
— same origin, which is what makes fetch and the Cache API work; GitHub release
assets send no CORS header and are blocked outright.

### The corpus

| Array | Chapters | Verses | Book-Version leaves |
|---|---|---|---|
| `DALAIL_CHAPTERS` | 15 | 779 | `1,5,2,1,1,5,13,14,13,14,16,16,15,7,6` |
| `LITANY_CHAPTERS` | 18 | 950 | `5,7,0,0,13,13,12,15,14,11,18,6,4,5,5,4,4,7` |
| `QASIDAS` | 25 | 281 | — |
| `BURDAH_CHAPTERS` | 10 | 167 | — |
| `SIRAH_CHAPTERS` | 7 | 143 | — |
| `DIYA_CHAPTERS` | 8 | 120 | — |
| `ILAHI_CHAPTERS` | 11 | 70 | — |
| `BARZANJI_CHAPTERS` | 17 | 2 | — |

`LITANY_CHAPTERS` holds three collections: `[0]` Ghāyāt and `[1]` Wiqāyah
standalone; `[2]` and `[3]` are **title slots** naming Ḥizb al-Istighfār and
al-Ḥizb al-Aʿẓam (no verses — they supply the name for the row and sub-page
header); `[4]`–`[10]` are the Aʿẓam's seven daily portions, `[11]`–`[17]` the
Istighfār's seven.

---

## The reference edition

**Dalāʾil al-Khayrāt — the Istanbul printing.** `Dalailul Khayrat - Istanbul.pdf`,
290 pages, image-only (no usable text layer), 34,882,677 bytes.

| PDF pages | Section |
|---|---|
| ~20–135 | Dalāʾil al-Khayrāt |
| ~136–230 | al-Ḥizb al-Aʿẓam |
| ~232–290 | al-Istighfārāt |

Every page names its section and its day in the running head, so a chapter can
be **confirmed** at each step rather than inferred from a page offset. Legible at
200 dpi. "Follow the book" means this printing; if another turns up, this line
says what the app was collated against.

---

## Non-negotiables

### 1. Never retype Arabic that already exists

If a passage is already in the app — the Fātiḥa, al-Ikhlāṣ, the 99 Names, any
āyah another chapter carries, the ṣalawāt refrains — **copy the existing bytes
out of the file** and assert byte-identity afterwards. Do not retype it, however
short.

Retyping produces text that looks identical and isn't: diacritic order varies,
and two visually identical strings with different byte order will not match, not
compare equal, and not be found by search.

### 2. Typed Arabic anchors do not match the file's bytes

This has cost more time than everything else combined.

Combining-mark order differs per verse. `indexOf`, `split` and `replace` with a
typed Arabic needle **silently return zero matches**. The edit appears to succeed
and changes nothing.

Do not locate text by typing it. Instead:

- split the verse's own `ar` string on spaces and edit **by word index**, or
- locate an offset with a hamza-normalising bare matcher (`أإآٱ→ا`, `ى→ي`,
  `ة→ه`, `ؤ→و`, `ئ→ي`, strip all harakat) that also skips Arabic commas (U+060C)
  and requires the match to start at index 0 or after a space.

**Assert every anchor matches exactly once.** Taking occurrence 0 without
checking is how a match once landed mid-word and split it.

**Anchor on the field key, not just the value.** A locator that searches for a
verse's value alone breaks on an empty field: `indexOf('')` returns the cursor,
which sits at the end of the *previous* field, so the write lands inside that
value. Filling eight blank `tr`/`en` columns this way appended Latin text to
the end of eight Arabic strings. Search for `"tr": "<value>"` — key, colons and
quotes included — and assert the span is bounded by quotes before writing.

### 3. Never translate the Qurʾān

**The owner's standing instruction: do not render Qurʾānic text into English
in-house.** Where a verse carries Qurʾān, `en` stays empty — even when every
neighbouring verse has one, even when the app already has settled wordings for
the phrases involved, and even when filling the gap is the task at hand.

This was broken once, in v389: the five Qurʾānic passages in the Opening Duʿāʾ
(`[1]` v27–v31 — al-Ikhlāṣ, al-Falaq, an-Nās, al-Fātiḥah, al-Baqarah 1–5) were
given English and shipped, then reverted in v390 at the owner's instruction.
The rule was not written down here, which is why it was broken; it is now.

Transliteration is a different thing and is fine — those five verses carry
`tr` and always have. An **empty `en` on a Qurʾānic verse is deliberate, not a
gap to be filled.** If a report counts it as missing coverage, the report is
wrong.

### 4. Edits are all-or-nothing

Build scripts must check every anchor **before** writing anything, and throw if
any count is wrong. This has saved the file repeatedly — three anchors were wrong
in one recent build and it wrote nothing all three times. Never write a file
part-way through a set of edits.

### 5. Two apps, one corpus

`DALAIL_CHAPTERS` and `LITANY_CHAPTERS` must be **byte-identical between the two
apps**. Any change to either goes into both `index.html` files in the same
commit. A divergence here is the single most expensive thing to unpick later.

---

## Following the book

The Arabic comes from the Istanbul printing. Where the book and the app disagree
on a word, **flag it and let the owner decide** — do not quietly rewrite either
way.

The standing exception is a formulaic element dropped once where the same formula
is printed correctly many times nearby; that is a compositor's slip and is
corrected, with a note. Three such corrections exist in the Istighfār. Where a
reading is merely odd and there is nothing to check it against, it stays as
printed (see *Settled* below).

### سيدنا — RULING REVERSED, September 2026

**The old rule said: keep the app's سيدنا everywhere the book omits it.
That is no longer the rule. Do not follow it.**

سيدنا was at some point inserted into the Dalāʾil Arabic in places the printing
does not have it. The app is being brought back to the book.

**The rule now:**

- **Follow the printing exactly** — both where it has سيدنا and where it does not.
- **Correct in both directions.** Remove where the book lacks it; add where the
  book has it and the app does not.
- **Preserve the book's own inconsistencies.** If the same formula carries سيدنا
  on one page and not the next, reproduce that. Do not normalise.
- **`سيدنا ومولانا` is out of scope** — leave those untouched (35 occurrences).
- **Before إبراهيم is in scope** (58 occurrences).
- **`tr` and `en` move in step with the Arabic.** All three columns stay
  consistent.
- **Dalāʾil only.** This ruling does not extend to the litanies.

**Scale:** 601 occurrences in `DALAIL_CHAPTERS`, 566 in scope. 428 precede
محمد, 58 إبراهيم, the rest prophets and angels. 271 distinct 6-word contexts; the
top 20 cover 45%, and 194 contexts occur exactly once — so the formulaic bulk and
a long tail of one-offs are two different tasks.

**All eight day-chapters are collated and spliced.** What was actually removed,
against what the earlier estimate guessed:

| Chapter | before | after | removed | estimate said |
|---|---|---|---|---|
| `[6]` Monday P1 | 123 | 4 | 119 | 34 |
| `[7]` Tuesday | 79 | 44 | 35 | 39 |
| `[8]` Wednesday | 69 | 44 | 25 | 16 |
| `[9]` Thursday | 70 | 7 | 63 | 15 |
| `[10]` Friday | 134 | 0 | 134 | 25 |
| `[11]` Saturday | 98 | 4 | 94 | 37 |
| `[12]` Sunday | 30 | 2 | 28 | 7 |
| `[13]` Monday P2 | 25 | 3 | 22 | 1 |

520 removed in total, none added. **The estimates were useless** — they excluded
`سيدنا محمد`, which is the overwhelming bulk of it, so every row read 3–5× low.
Measure the chapter; never quote a stored figure.

`[5]` Names of the Prophet ﷺ (2 in scope) is **not yet done**.

Tuesday is deliberately partial: only the 35 the scan shows bare were removed,
**v132 is untouched on the owner's instruction**, and the `سيدنا ومولانا` block
is out of scope by the ruling.

**Method — one chapter per commit:**

1. Rasterize that day's pages; confirm the running head names the right day.
2. Locate each occurrence on the page, reading at zoom where the script is dense.
3. **Show the owner the findings before changing anything** — occurrence, page,
   and whether the book has it.
4. Splice, moving `tr` and `en` with the Arabic.
5. Verify: the battery below, **plus a سيدنا count before and after**, so nothing
   moves silently.

**What the collation settled** (Wednesday first, book pp.46–58, then the
remaining seven). Follow these for `[5]` and for any re-check:

- **Count `وسيدنا` and `لسيدنا`, not just bare `سيدنا`.** Wednesday was 58 bare but
  69 all told, and the 11 extra are where most of the errors were.
- **`وَسيدنا` carries the conjunction.** The book writes `وَآدَمَ`, not `آدَمَ` — so the
  waw moves onto the name. Deleting the whole token swallows it, and the
  transliteration still comes out right, so nothing catches it but reading the
  Arabic. Assert the waw count per verse is unchanged.
- **The Ibrāhīmic ṣalawāt is bare in this printing** — `عَلٰى مُحَمَّدٍ وَعَلٰى اٰلِ مُحَمَّدٍ
  كَمَا صَلَّيْتَ عَلٰى اِبْرٰهِيمَ`. That one formula was 14 of the 25.
- **The book contradicts itself within a verse and that is kept**: p49 prints
  `عَلٰى سَيِّدِنَا اِبْرٰهِيمَ` and then `عَلٰى اٰلِ اِبْرٰهِيمَ` two words later.
- **`سيدتنا` before حواء stays** (owner's call — the ruling names سيدنا only).
- Where a name is bare in the Arabic, drop "our master" from `en` too.
- **A carried prefix must keep its own vowel.** Splitting the token at an index
  found in the *normalised* string cuts between the waw and its fatha and
  carries a bare `و`, printing `ومُوسَى` for `وَمُوسَى`. Eighteen words went out
  that way before it was caught. Neither the character-bag invariant (the fatha
  sits inside the deleted token, so it is *expected* to vanish) nor a
  waw/lām/bāʾ consonant count can see it. **Consume the combining marks after
  the split point, and assert a per-verse diacritic count.**
- **`en` renders the honorific three ways**: "our master", "our liege-lord" and
  "our lord and master" (and `سيدتنا` as "our Liege-lady"). A regex for "our
  master" alone leaves the others standing — six survived the first pass.
- **`tr` attaches the prefix too** (`lisayyidinā`, `bisayyidinā`). Removing the
  honorific there glues the prefix to the next word (`liAdama`); the app's own
  convention hyphenates it — `li-Adama`, `bi-Muḥammadin`.
- **Where سيدنا survives:** the Ibrāhīmic ṣalawāt is always bare, prophet and
  angel lists are bare, and it holds mainly on Muḥammad in a named epithet
  formula — `عَدَدَ مَا اَحَاطَ بِهِ عِلْمُكَ`, `النَّبِيِّ الْأُمِّيِّ`, `نُورِ الْأَنْوَارِ`,
  `خَاتَمِ النَّبِيِّينَ`, `مُحَمَّدِ بْنِ عَبْدِ اللهِ`. Friday has none at all. A
  grammatical nominative (`سَيِّدُنَا مُحَمَّدٌ` as the subject of a verb, Saturday
  v21) stays.
- **The owner's text files are not a collation source.** They were proposed as
  the primary comparison and proved to be the app's *own* source: Wednesday's
  text matched the pre-splice app exactly, zero placement mismatches across
  1,258 words. Comparing against them would have audited clean on all seven
  days and changed nothing. Collate from the scans.

---

## Arabic conventions

### Markers

- **`۞` (U+06DE)** divides one recitation unit from the next. **A space either
  side, always.** The renderer appends one after every verse, so `۞` inside `ar`
  is only for divisions *within* a verse. Never mirrored into `tr` or `en`.
- **`‖` (U+2016)** forces a Book-Version page break at that word. Page breaks come
  only from `‖`, never from folio arithmetic. A trailing `‖` still turns the page.
- **Order at a page turn: `word، ‖ next`.** The comma stays with the word before
  the break. `‖ ،` is a bug.
- Which side the rosette falls on at a page turn **varies and must be read off the
  scan**: `۞ ‖` when the book closes the page with it, `‖ ۞` when it prints it at
  the head of the next page.

### Verse flags

- `noRosette` — the book closes this verse bare. **Check the last line of every
  day**: across the Istighfār's seven, five close with a rosette and two without.
- `shortPage` — the book leaves this leaf part-empty.
- `sep: 'ﷻ'` — the Names.

### Orthography

Two house styles coexist, deliberately.

**The Dalāʾil** uses proper hamza seats: `أَسْتَغْفِرُكَ`, `إِلَى`.

**The litanies** (Ghāyāt, Aʿẓam, Istighfār) follow their printed edition's
Ottoman convention:

- word-initial hamza is a **bare alif** with its vowel — `اَسْتَغْفِرُكَ`,
  `اِنِّي`, `اَوْ`. 1100 instances against 18 exceptions.
- a prefix doesn't change that: `وَاِلٰى`, `بِاَوْزَارِي`, `كَاَنِّي`.
- **medial and final hamza take a proper seat**: `وَسَأَلْتُكَ`, `جُرْأَةً`,
  `اَخْطَأْتُهُ`.
- `اِلٰى` and `حَتّٰى` carry the dagger; the Dalāʾil writes `إِلَى`.

App-wide, regardless of section:

- the lafẓ al-jalāla always carries the dagger: `اللّٰه`, `بِاللّٰهِ`, `لِلّٰهِ`,
  `وَاللّٰهُ`. One deliberate exception: the colloquial `بِاللهْ` in the Iraqi
  qasida.
- `عَلٰى` with the dagger; `آ` not `اٰ`.
- article-lām sukūn, sun-letter shadda, plain ḍamma on the `-hu` pronoun.
- fixed spellings: `السَّمَاوَاتِ`, `الْحَيَاةِ`, `الصَّلَاةِ`, `الْقِيَامَةِ`,
  `إِبْرَاهِيمَ`, `مُوسَى`, `عِيسَى`, `إِسْرَافِيلَ`.

**Do not decide orthography from memory.** Extract the existing vocabulary from
the file, look up the byte-form the app already uses for that word, and use it.
Check every new word for a mark-order mismatch against what is already there.

### Coloured ink

Passages the book prints in coloured rather than black ink go in
`INLINE_INSTRUCTIONS`, which golds them inline without breaking the line. Repeat
counts use the `" (3)"` convention — never `(3x)`.

---

## Transcribing from a scan

The PDFs have **no text layer worth using**. Extraction scrambles RTL and drops
characters, and has produced confidently wrong readings for whole words. Ignore
it.

1. `pdftoppm -png -r 300` (200 is enough for the Istanbul scan).
2. Find line bands by row-ink profile, then crop two lines at a time at ~1.7×.
3. For any uncertain letter, vowel or rosette placement, crop that word at 3–6×.
   This catches something on nearly every day — a dāl read as a rāʾ, a ḍamma that
   changes a verb's person, a dropped word.
4. **Locate rosettes by colour**, not by eye — they print red and blue and
   separate cleanly from the ink. Run a loose *and* a strict threshold: density
   varies and a single pass has missed one.
5. Show the owner the proposed text and the page-end words **before** applying.

Then simulate pagination before building: reproduce the leaf splitter and assert
the leaf count, each leaf's last word, and per-leaf rosette counts against the
scans. A day is not right until rendered rosette counts match the page counts
exactly.

---

## Build and release

1. Bump **`APP_VERSION` in `index.html` and `CACHE` in `sw.js` together.** They
   must match or the worker serves stale content forever.
2. Also bump `<meta name="app-version">`.
3. Apply the same change to **both apps**.
4. Package all 7 files per app: `index.html`, `sw.js`, `manifest.json`,
   `icon-192.png`, `icon-512.png`, `OFL.txt`, `README.md`.

Cache strings `mawlid-vNNN` / `dalail-vNN`. The audio cache is **`mawlid-audio`
in both apps** — same origin, so a portion downloaded in one is already present
in the other. It carries **no version number**, and `KEEP` in `sw.js` spares it;
version it and every release wipes the users' downloads.

The service worker precaches with `cache:'reload'` and fetches navigations with
`cache:'no-store'`. Both are deliberate: `addAll()` defaults to the HTTP cache and
once precached the *previous* `index.html`, so the app appeared to update and then
flipped back on the next refresh.

Deploy: open each app **twice** to clear the old worker. For an icon or manifest
change, remove and re-add the home-screen shortcut — Android reads the manifest
only at install.

The version bump touches the same two lines every time, so it is a guaranteed
merge conflict. **Whoever merges second re-bumps.**

---

## The verification battery

Run all of it before opening a pull request.

**Structure**
- both apps' `LITANY_CHAPTERS` byte-identical; same for `DALAIL_CHAPTERS`
- every array not deliberately touched byte-identical to the previous release
- Book-Version leaf counts unchanged where pagination shouldn't have moved

**Text hygiene** — all zero:
- unspaced rosette `/[^\s۞]۞|۞[^\s۞]/`; `، ۞`; `‖` before a comma
- double spaces; leading/trailing whitespace
- detached one-letter prefixes (`وَ` alone as a word); empty `ar`
- bare lafẓ al-jalāla without its dagger

**Code**
- every inline `<script>` parses (`new Function(src)`); `sw.js` parses
- previews differ from `index.html` only by the stripped `@font-face` payloads

**Rendering**
- simulate the leaf splitter; compare per-leaf rosette counts against the scans

---

## Settled — do not "fix" these

- **Monday P2 p124**: the v8/v9 boundary falls mid-unit, so that leaf shows one
  rosette more than the scan. Merging them was **declined** — it renumbers every
  later verse and shifts the offset the owner counts by.
- **Tuesday v1**: the rosette after `هٰذَا` looks misplaced. Verified at 300 dpi —
  it is printed there.
- **Tuesday v16**: `فَلَا` is a deliberate departure from this printing.
- **Istighfār Monday p247**: `اقْتَدَدْتُ` doesn't parse but stays as printed —
  two candidate corrections, nothing to arbitrate between them.
- **Aʿẓam Thursday p209**: the dittography **was** removed (a verbatim four-word
  repeat, against the al-Aʿlā 87:2–3 verb+fāʾ+verb pattern the passage runs on).
- The **1113 commas in the Dalāʾil's Book Version** are deliberate; every other
  collection keeps the commaless manuscript look.
- ` · ` is a **pervasive UI separator** — 600+ occurrences. A global
  find-and-replace on it wrecks the file. This has happened once.
- `/[A-Z]/` does **not** match the Latin-Extended capitals used in the
  transliteration (Ḥ, Ṣ, Ṭ, Ẓ, Ā). Use
  `c !== c.toLowerCase() && c === c.toUpperCase()`.

---

## Live sessions

Everyone's screen follows a leader over a Supabase Realtime channel. The anon key
in `SESSION_CONFIG` is public by design — **never put the service_role key there.**

Three invariants, each learned the hard way:

- **`PROBE_MS` must stay greater than `BEAT_MS`.** A joiner's probe has to outlast
  a whole heartbeat or it can decide a busy room is empty. It was 2800 against a
  4000 beat, and that offered the mic to people joining a session someone was
  already leading.
- **`alive` carries a client id and drives the leader-demotion tiebreak.** A
  follower vouching that the room is occupied sends `present`, never `alive`, or
  it demotes a real leader.
- **Don't add waiting stages to compensate for a bad probe.** A "still looking"
  delay was added when the probe was unreliable, then left in after it was fixed —
  which meant the first person into a new session waited 14 s on a leader who did
  not exist. Fix detection; don't pad it.

`slog` keeps a rolling in-app log of role changes and probe outcomes — the fastest
way to see what each device actually decided.

---

## Known open items

**Raised during the سيدنا collation.** Three of these were first written down
wrong; the corrected reading is what stands here. **Re-measure a flag before
acting on it** — all three errors were in the summary, not in the audit files
under `findings/`, which were right.

- **Tuesday is missing two `‖` page breaks.** The leaf count measures 12 where
  the corpus table records 14. Pre-existing; the splice did not move it.
- **Tuesday v134 — the app has a clause the book does not.** The note used to
  read that the app *lacked* `وَعَلٰى آلِ إِبْرَاهِيمَ`. The reverse is true: the app
  carries it, and `findings/tue.md` records "book also lacks the
  `وَعَلٰى آلِ إِبْرَاهِيمَ` clause entirely". Matching the printing therefore means
  **deleting** three words of Arabic, which is outside the سيدنا ruling.
  **Owner's call, not yet made.**
- ~~Monday P1 v43 tatweel~~ — **it was Wednesday v43, and it is fixed** (v389).
  `أَنْبِيَـاءِ` now matches v44's spelling byte-for-byte. Three tatweels remain
  and are all correct: `هـ` in the Title Page (the AH abbreviation) and
  `وَمَلَـٰٓئِكَتَهۥ` / `يـٰٓأَيُّهَا` in Monday P1 v18, which are Uthmani Qurʾānic forms.
  **Do not strip those.**
- ~~Sunday v19's `en`~~ — **not a fault.** The "O our Master" there renders
  `يَا مَوْلَانَا`, which is in the Arabic and out of scope by the ruling.
- On four days the app disagrees with its own source text in one to three
  places, on words unrelated to `سيدنا`.

- **Bookmarks** were rebuilt in v383 to mark the exact `.seg` word group. Untested
  on a real device. The symptom was a highlight covering several rosettes,
  starting earlier than the tap — caused by falling back to the whole `.ms-v`
  verse element and, when the candidate was missing, to the top verse of the leaf.
- **`leaderPending`** and its panel branch are now unreachable — nothing sets the
  flag. Harmless, but dead code that could mislead.
- **Transliteration and English** for al-Ḥizb al-Aʿẓam and Ḥizb al-Istighfār —
  Arabic-only by the owner's call (752 of `LITANY_CHAPTERS`' 950 verses). The
  renderer handles per-verse `tr`/`en`, so this can be layered in later with no
  restructuring. **Diyāʾ (120 verses) and the ilāhīs (70) have `en` but no `tr`**
  at all — not yet raised with the owner.
- **The Title Page's three `tr` were filled** in v389. The five Qurʾānic `en` in
  the Opening Duʿāʾ were filled in the same release and **reverted in v390** —
  see non-negotiable 3. Those five are the only Dalāʾil verses without an `en`,
  and they stay that way.
- **The Barzanji is a 17-chapter shell with 2 verses.** Only `[0]` Opening Praise
  has text; the other 16 render the "No entries here yet" placeholder to users,
  while the home card advertises 17. Fill or remove — the same decision that was
  taken for the Nasheeds section. **Owner's call.**
- **The article-lām sukūn sweep is larger than it looks**: 81 occurrences across
  76 distinct words carry an article lām before a moon letter with no sukūn
  (`وَالخَاتِمِ`, `وَالمَلَائِكَةِ`, `بِالحَقِّ`). The old note said "three `وَالحَمْدُ`";
  `وَالحَمْدُ` is only 4 of them. Check the printing before sweeping.
- **`LITANY_CHAPTERS[2]`/`[3]`** stay as title slots; do not fill them with verses.

---

## Style

Comments explain **why**, especially where the obvious approach was tried and
failed — much of this file's value is in that record. Prefer editing and
condensing over appending; this file is read on every run, so a stale line is
worse than no line, because it will be followed confidently.

This is a devotional text people recite from. A plausible-looking wrong word is
worse than an obvious missing one.

When in doubt about a reading, a variant or a structural choice: **ask the owner
rather than guessing.** Every ruling recorded above came from doing exactly that.
