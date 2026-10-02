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
| **Mawalid** (this repo) | the full collection | **v446** |
| **Dalāʾil al-Khayrāt** | a slimmer fork: Dalāʾil and the aḥzāb only | **v104** |

Deployed by GitHub Pages from `main`. **Anything merged is live within a
minute**, and people recite from it.

Audio lives in a second repo published to Pages (`zboon.github.io/mawlid-audio/`)
— same origin, which is what makes fetch and the Cache API work; GitHub release
assets send no CORS header and are blocked outright.

Recordings are **keyed by kind**, not by chapter index alone: `AUDIO_BY_KIND`
maps `d` → `DALAIL_AUDIO` and `q` → `QASIDA_AUDIO`, and `audioFor(kind, idx)`,
`allAudioEntries()` and the manage screen all read through it. Until v402 the
lookup returned `[]` for anything but `d`, and the manage screen took its row
titles from `DALAIL_CHAPTERS` directly — adding a recording anywhere else needs
both of those, or the row renders blank. `audioUrl()` percent-encodes each path
segment because one file name has spaces in it; it is the **only** place a URL
is built, which is what keeps the fetch and the Cache API key the same string.

A recording may carry its own **`title`**, which the player, the lock screen
and the Downloads row show in place of the piece's title — the Caravaner's
Qasida (`QASIDA_AUDIO[4]`, `Caravan Qasida.mp3`, 309 s, v421) is "The
Caravaner's Qasida" there, not its full "— Ṣalātullāhi mā lāḥat kawākib"
heading. It carries **no `reciter`, on the owner's instruction** — don't
credit one; its only artist tag reads "Roy Clark" and is not to be used. The player and Downloads row are built to render a missing reciter
cleanly — keep them that way.

A recording may also carry a **`start`** in seconds — where the player opens
it. Ṭālamā Ashkū Gharāmī (`QASIDA_AUDIO[9]`, `Talama Ashku Gharami.mp3`,
517 s, v423) starts at 93 s (1:33), where the qasida begins, on the owner's
timing. The seek is set on `loadedmetadata` (earlier is silently lost), and
it needs a server that answers byte ranges — Pages does; a downloaded copy
plays from a blob and is always seekable. `secs` stays the whole file.

The **Listen button shows when there is a local recording or a `video` link**.
It used to require `video`, so a chapter with a file and no YouTube link had no
way to reach its own audio.

`secs` is measured from the file. With no `ffprobe` in the sandbox, read the
MP3's Xing frame count and divide by the sample rate; the ID3 `TPE1` tag is
also where the reciter's name came from.

### The corpus

| Array | Chapters | Verses | Book-Version leaves |
|---|---|---|---|
| `DALAIL_CHAPTERS` | 15 | 779 | `1,5,2,1,1,5,13,14,13,14,16,16,15,7,6` |
| `LITANY_CHAPTERS` | 18 | 950 | `5,7,0,0,13,13,12,15,14,11,18,6,4,5,5,4,4,7` |
| `QASIDAS` | 42 | 457 | — |
| `BURDAH_CHAPTERS` | 10 | 167 | — |
| `SIRAH_CHAPTERS` | 7 | 143 | — |
| `DIYA_CHAPTERS` | 8 | 120 | — |
| `ILAHI_CHAPTERS` | 11 | 70 | — |
| `BARZANJI_CHAPTERS` | 19 | 123 | — |
| `QAWWALI_CHAPTERS` | 33 | 326 | — |

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

### 5. Ask before anything reaches main

**Never push or merge to `main` without the owner saying so for that specific
change.** Pages deploys from `main`, so a merge is a publication to people
reciting from the app within the minute — it is never a step in a workflow, it
is the decision at the end of one. Work on a branch, push the branch freely,
then stop and ask.

Two guards enforce it, because asking is a habit and habits slip:

- `.claude/hooks/guard-main-push.sh`, wired up in `.claude/settings.json` as a
  PreToolUse hook on Bash. It reads each command and returns `ask` for anything
  that would push to `main`/`master` — including a bare `git push` while on
  main, `HEAD:main`, and a push buried in a loop or after `&&`. **It only loads
  for sessions that started with `.claude/` already present**, so the session
  that creates or edits it is not covered by it.
- `.githooks/pre-push`, which git runs regardless of who is pushing. It refuses
  a protected-branch push unless the command carries `MAIN_PUSH_OK=1`. Enable it
  in a fresh clone with `git config core.hooksPath .githooks` — it is config,
  not content, so cloning does not set it.

Neither is a refusal: both exist so the push is a decision the owner makes out
loud. `MAIN_PUSH_OK=1` goes in the command only after they have said yes to
that change.

### 6. Two apps, one corpus

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

**Wednesday `تُبُلِّغُنَا`/`وَتُبُلِّغُنَا` — v415/v91.** Reported by the owner reading
from the app: a damma on the ب where the Form II mudāriʿ pattern (`تُفَعِّلُ`)
takes a fatha there. Three occurrences, all in the same chapter — v24, v33
(the word right before the `‖` on book p.7), v34 (the very next leaf) — all
corrected to `تُبَلِّغُنَا`/`وَتُبَلِّغُنَا`. The identical verb form is spelled
correctly with fatha-on-ب elsewhere in the corpus (Tuesday v3, Saturday v21,
both `تُبَلِّغَنِي` — a different pronoun suffix, ـنِي "me" vs Wednesday's ـنَا
"us", which is why the vowel on the final غ legitimately differs between them;
only the ب was ever wrong). `tr` already read "tuballighunā" throughout and
needed no change — only the Arabic bytes moved.

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

`[5]` Names of the Prophet ﷺ (2 in scope) is **not yet done** against the
scan. (The Mughlay version separately adds `سَيِّدُنَا` before all 200
names — see *Two versions of the Dalāʾil*; that does not touch the Istanbul text.)

**Both apps offer the pre-collation text too (v426 / v97)** — see *Two
versions of the Dalāʾil* below. The ruling above governs `DALAIL_CHAPTERS`, which is the
**Istanbul** version; it is not a licence to edit the other.

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
  side, always.** The **Book Version** appends one after every verse (unless
  `noRosette`, or the verse runs on to the next leaf), so a `۞` inside `ar` is
  only for divisions *within* a verse. The **Study Version appends none** — each
  verse already sits in its own numbered card — so every rosette it shows is an
  internal one. Never mirrored into `tr` or `en`.

  **Nothing is faded, in either view (v408).** v405 dimmed the internal
  rosettes so the full-strength ones would mark where a verse begins and ends;
  the owner had that out of Study in v407 and out of the Book Version in v408.
  The printing sets every rosette alike and the app follows it. The `ms-r-in`
  class still marks which Book rosettes are internal — it just carries no
  styling. Internal rosettes are also what `segWrap` splits on to build the
  tappable segments, so they set the bookmark granularity — don't suppress
  them outright.

  Scale, if a sweep is ever proposed: 129 of the Dalāʾil's 779 verses carry an
  internal rosette (one has 37 — 779 verses make 1,257 units), every Burdah
  verse has exactly one between its hemistichs, and 322 of the 449 qasida
  verses have at least one.
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
counts use the `" (3)"` convention — never `(3x)`. **The `x` is not cosmetic:**
the golding regex matches only digits in brackets, so `(2x)` renders as plain
text. v411 swept **62** of them out of ten qasidas and one Sīrah line — only 2
of the qasidas' Arabic repeat counts had been golded; 30 are now. A new import
that brings `(Nx)` with it needs the same treatment. **Western digits, in the
Arabic column too:** 29 of those came in as `(٢x)`, and were written `(2)`, not
`(٢)` — every one of the 24 golded counts already in the corpus used western
digits, and Amiri draws `(٢)` inside an ornamental medallion, a look the app
had never shown.

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

**Each app's `activate` sweeps only its own old caches** (`OWN` =
`mawlid-v` / `dalail-v`), v446 / v104. The two apps share one origin,
`zboon.github.io`, so `caches.keys()` lists **both apps' caches**. Until then
the sweep deleted everything not in `KEEP`, so whichever app updated wiped
the other's offline copy, and that app then would not open with no signal
(owner's report: "the webpage couldn't be fetched"). Reproduced with both apps
served from one local origin and the server actually stopped. Playwright's
`setOffline` does **not** cut a service worker's own fetches, so it hides this.
Never widen the sweep again.

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
- **Saturday v15 `شِيثَ`** carries a plain fatha, not `شِيثاً`. Corrected in v391 on
  the owner's reading; verified at 4× on book p8 of the Saturday block. The
  printing treats it as a diptote like every other name on that line
  (`اِسْمٰعِيلَ`, `وَاِسْحٰقَ`, `يُوسُفَ`, `يَعْقُوبَ`), so the tanwīn was the anomaly.
- **Tuesday v16**: `فَلَا` is a deliberate departure from this printing.
- **Istighfār Monday p247**: `اقْتَدَدْتُ` doesn't parse but stays as printed —
  two candidate corrections, nothing to arbitrate between them.
- **Aʿẓam Thursday p209**: the dittography **was** removed (a verbatim four-word
  repeat, against the al-Aʿlā 87:2–3 verb+fāʾ+verb pattern the passage runs on).
- The **commas in the Dalāʾil's Istanbul version** are deliberate (1,065
  measured in v426; an older note said 1113); every other collection keeps
  the commaless manuscript look, and so does the Mughlay version.
- ` · ` is a **pervasive UI separator** — 600+ occurrences. A global
  find-and-replace on it wrecks the file. This has happened once.
- `/[A-Z]/` does **not** match the Latin-Extended capitals used in the
  transliteration (Ḥ, Ṣ, Ṭ, Ẓ, Ā). Use
  `c !== c.toLowerCase() && c === c.toUpperCase()`.

---

## The full-screen menu stranded the reader — and broke Save my place

**Both apps, v404 / v81. One root cause, two reports.**

`msMenuAct('study')` called `setPageView(false, p.idx)`. The signature is
`(on, kind, idx)`, so the **index landed in `kind`**, `idx` was undefined,
`reopen()` found no opener and — by its own deliberate design — returned
quietly. The result: `state.pageView` said Study while the Book leaf stayed on
screen, and in the fork `dlk-view` was persisted as Study on the way out.

Two things then went wrong, and the second is not obvious:

- **The reader was stuck.** `setPageView` opens with
  `if(state.pageView === on) return;`, so the Study chip was a no-op from then
  on. Recovery was Book first, *then* Study — which is why it felt broken.
- **"Save my place" silently stopped working.** `saveDalailPlace` branched on
  `state.pageView`, so with the flag saying Study it took the Study path:
  `verse: topVisibleVerse()`, which finds no `article.verse` in a Book render
  and returns **0**. It stored a Study place at verse 0 with no `mk` — nothing
  highlighted, the chip never lit, and the bookmark pointed at the top of the
  chapter. Reported as "Save my place isn't working at all on Sunday"; Sunday
  was just the day being read.

Three defences now, and all three matter:

1. The call passes `p.kind, p.idx`. `msPiece` carries both — use them.
2. `setPageView` **bails before touching state** unless `OPENERS[kind]`
   resolves to a function. Mutating state that the DOM will not follow is what
   strands a reader, and the early return above then hides it.
3. `saveDalailPlace` takes its view from **`renderedView()`**, not
   `state.pageView`. That helper exists precisely for this and its own comment
   says so; the bookmark was a caller that should have been using it.

**The Save chip is Book-Version only** (`kind === 'd' && pageView`), so there
is no Study-view save to reach from the UI — worth knowing before testing it.

---

## Where a duʿāʾ starts — three attempts, all reverted

**Settled for now: the Study card stays the corpus verse, and no rosette is
faded anywhere.** Live is v408 / v85, which is v404 rendering exactly. Do not
re-propose any of this without the owner raising it first.

The problem is real and unsolved. The `verses` array's boundaries are an
**editorial chunking nobody recorded** — they arrived whole in commit `840c749`
("Add files via upload"), not from the printing, which marks every rosette
alike and distinguishes no duʿāʾ from any other. So a reader cannot see where
one petition ends and the next begins, and Sunday v33/v34 (one duʿāʾ split in
two) and v20 (eleven petitions in one card) are both artefacts of it.

What was tried, in order, and why each came back out:

1. **v405 — fade the internal rosettes** in both views, so the full-strength
   ones read as boundaries. Out of Study in v407 (every rosette there is
   internal, so the fade marked nothing) and out of the Book Version in v408
   on the owner's call — the printing sets them all alike.
2. **v406 — number the units inline** inside the Arabic, subordinate to the
   verse circle. *"Too complicated"* — two competing counts on one card.
3. **v407 — one card per unit** (the rosette as card boundary, numbered
   straight through: Sunday 49 verses → 92 cards). Shipped and reverted within
   the hour: *"too hard to read with every few sets of words being its own
   card."*

**A real re-chunk of the corpus is the only untried option, and it is
expensive.** `tr` and `en` carry no rosette and cannot be split mechanically:
only **21 of the 129** multi-unit verses have one sentence per unit, and the
large ones are hopeless (Saturday v21 is 38 units in 3 sentences, Friday v1 is
26 units in one). It is ~600 transliteration and ~600 translation fragments cut
by hand inside a devotional text, plus a `folios` remap (they are verse-index
ranges) and every stored bookmark invalidated. **Owner's call, not made.**

Worth knowing if it is ever revisited: the v407 implementation is in
`04c6f03` (fork `ce38653`) and was sound — a render-time split that kept every
card on its source verse's `data-v`, with `arUnitsHTML` splitting the finished
html so `.seg` numbering ran on across the verse, and `placeVerse` /
`scrollToVerse` taught to treat a verse as a group of cards. The code was not
the problem; the reading experience was.

## The repeating refrain

**Both apps, v403. Barzanji chapter 4 (`BARZANJI_CHAPTERS[3]`, "The Birth of
the Prophet ﷺ").** v3 — `يَا نَبِيّ سَلَامْ عَلَيْكَ`, where the gathering stands —
is flagged `refrain: true`, and **v4–v20 each carry `repeatRefrain: true`** on
the owner's call: the refrain returns after every verse of the qasida, through
both *Ashraqa al-Badru* (v4–17) and `يَا وَلِيَّ الْحَسَنَاتِ` (v18–20). The prose
at v1–v2 and v21–23 carries none.

The flags are **data, not a hard-coded chapter**: `refrainRepeatHTML(q)` takes
the chapter's own `refrain` verse, so any piece can use this by flagging its
verses. Flagged so far: this chapter, Balagha-l-ʿUlā (`QASIDAS[41]`, below),
and **Yā Imāma-r-Rusli (`QASIDAS[16]`, in the Daybaʿī) — v419, Mawalid only**:
the refrain returns after every two verses, i.e. after cards 3, 5, 7 and 9,
which is where each of its four couplets closes on the ‑ami rhyme. And
**Qaṣīdatu s-Salām (`QASIDAS[17]`) — v420, Mawalid only**: after every verse
(cards 2–12), with its note changed from "after each set of verses" to "after
each verse" so the two agree. And **the Caravaner's Qasida (`QASIDAS[4]`, in
the Daybaʿī) — v421, Mawalid only**: after every verse (cards 2–17). And
**Marḥaban Marḥaban (`QASIDAS[7]`, in the Daybaʿī) — v422, Mawalid only**,
which has **two** refrains: card 1's after cards 2–4, card 5's after cards
6–8. `refrainRepeatHTML(q, n)` repeats the **nearest `refrain` above the
verse**, not the chapter's first — so a second refrain partway through takes
over from there, and every single-refrain piece is unaffected. And **Ṭālamā
Ashkū Gharāmī (`QASIDAS[9]`, in the Daybaʿī) — v423, Mawalid only**: card 1
(the title verse) flagged as the refrain, repeated after cards 2–7. **Every
part of every verse is sung twice**, so each carries `" (2)"` in all three
columns, before any closing punctuation (`l-wujūd (2).`, `Existence (2)!`).
Singing the **whole refrain twice** is not a `(2)` in the text: it is
`times: 2` on the refrain verse, rendered as its own ruled gold line on the
card — "Sing the whole refrain twice · مَرَّتَيْنِ" — so it cannot be read as
one more per-line count (v424, owner's call; v423 had it as a bare `\n(2)`
line and the two were indistinguishable). Repeats never show it. Cards 3 and 6 divide their English at `, Consumed`
and before `My master` — neither is a plain two-sentence split. Two spellings
were corrected in the same release on the owner's instruction: v7's bare
`اللَّهُ` to the dagger form `اللّٰهُ`, and v6's `سَيَّدِي` / "Sayyadī" to
`سَيِّدِي` / "Sayyidī" — both copied from the app's majority bytes. And **Ṣallā-Llāhu ʿalā Muḥammad (`QASIDAS[10]`) — v424, Mawalid only**: after
every verse (cards 2–7), sung once each. And **Yā Arḥama-r-Rāḥimīn
(`QASIDAS[11]`) — v424, Mawalid only**: after every two verses (cards 3, 5 …
15), where each couplet closes on the ‑īn rhyme. Its `(3)` sits mid-refrain,
so every repeat keeps it. The same release removed a doubled
`يَا أَرْحَمَ الرَّاحِمِينْ` after that `(3)`, on the owner's instruction. The
fork's copies of all seven are untouched, per its stale-`QASIDAS` scope.

And **Ṭalaʿa-l-Badru (`QASIDAS[8]`) — v427, Mawalid only**: the refrain is
its **two** opening cards (`طَلَعَ الْبَدْرُ…` and `وَجَبَ الشُّكْرُ…`, owner's
call), repeated after every two verses — cards 4, 6 … 24 and the lone last
card 25. Card 2 carries **`refrainCont: true`**: it is styled as refrain and
`refrainRepeatHTML` gathers every `refrainCont` card straight after the
`refrain` one into the repeat. Kept as two cards rather than merged, so no verse was renumbered and
no highlight moved. Every other refrain rendered byte-identical before and
after. The fork's copy is untouched, per its stale-`QASIDAS` scope.

**#25, batch 1 — v436, Mawalid only: repeat points from the booklet.** The
Qasida booklet (`Qasida_V1.3.pdf`, PDF pp. 16–43) prints "Chorus" after
every stanza of most pieces — never after the opening stanza, nor after a
separate closing `اللّٰهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ…` line. Where a booklet stanza is
two app cards, the repeat falls every two cards. Applied to 14 pieces:
ʿIbādallāh, the Yā Rabbī Opening Qasida, Ayyuhā-l-Mushtāq and Mā Lanā
(2–6), ʿAdnānī (2–4), Yā Ṭaybah (2–3), Yā Abā-z-Zahrā and Yā Shafīʿa-l-Warā
(2–7), Yā Hanānā (2–4), the Badriyyah (2–14), Ashraqa (3, 5, 7, 9), Anta
Shamsun (2–4), Yā Rasūlallāhi Salāmun ʿAlayk (card 2 is `refrainCont` —
the booklet's chorus is two lines — cadence corrected in v438, below) and
An-Nabī Ṣallū ʿAlayh (all 2–11). User's rulings: Ayyuhā-l-Mushtāq's and Yā Shafīʿa's card 1
became the refrain, and Yā Shafīʿa's closing formula (card 8) lost its
Refrain label; **An-Nabī Ṣallū ʿAlayh lost three cards** (Marḥaban yā nūra
ʿaynī, and the two written-out refrains) to match the booklet — so its
cards were renumbered. The pieces the booklet has no chorus marks for are
batch 2.

**Yā Rasūlallāhi Salāmun ʿAlayk — cadence corrected, v438, Mawalid only**
(user's ruling). The v436 placement was wrong: `repeatRefrain` sat on the
*first* card of each pair (3, 5, 7 … 19), so the refrain returned after
just one verse the first time and the spacing read as staggered rather than
"every two verses." Moved to the *second* card of each pair (4, 6, 8 … 20)
so the refrain runs verse, verse, refrain throughout; the 19th and last
verse has no partner to pair with, so it keeps its own repeat too (card 21,
following the Allāhumma Ṣalli precedent of repeating after a trailing solo
verse). **The opening refrain (cards 1–2 together) is now sung twice**,
`times: 2` on card 1 — every later repeat still sings it once, since
`refrainRepeatHTML`'s repeat body never carries `v.times`. `times` has to
sit on card 1, not card 2: the note's wording reads off `v.refrain`, and
only card 1 carries that flag — putting it on the `refrainCont` card would
print "Sing the whole verse twice" instead of "refrain." The fork's copy is
untouched (pre-v436 text, no refrain flags at all), per its stale-`QASIDAS`
scope.

**Yā Nabī Salām ʿAlayka — Mawlid version (Ashraqa-l-kawn, #13), v439,
Mawalid only** (user's ruling). The refrain lost its fourth line,
`يَا رَسُولَ اللّٰه` — four lines now, `tr` and `en` in step. The repeat was
already after every two verses (cards 3, 5, 7, 9), so no flag moved. The
line was removed by index from the refrain's own `ar`, not by a typed
anchor. The fork's copy keeps the five-line refrain, per its
stale-`QASIDAS` scope.

**Qul Yā ʿAẓīm (#21), v442, Mawalid only** (user's ruling): the refrain
repeats after every verse, cards 2–4, the last included.

**Yā Rabbī Ṣalli ʿalā-n-Nabī Muḥammadin (#23), v443, Mawalid only**
(user's ruling): `" (2)"` before every rosette — the first hemistich of the
refrain and all eight verses — in all three columns (`tr` before its ` · `,
`en` at the hemistich break); refrain repeats after every two verses, cards
3, 5, 7, 9. Its note ("Repeat each verse twice…") was left as it was.

- **Collapsed by default**, showing one gold rule reading "↻ Repeat refrain".
  A tap opens **every marker in the chapter at once** — a reciter wants them
  one way or the other, not one at a time.
- **Toggling must not reopen the reader.** The body is always in the DOM and
  CSS hides it, so `toggleRefrain()` flips a class. A `reopen()` would scroll
  someone fifteen verses down back to the top — the same trap as the text-size
  slider.
- **`state.refrainOpen` is in memory and deliberately NOT stored**, unlike the
  size and the `tr`/`en` columns: a chapter always opens collapsed. It still
  survives a re-render, which is what keeps a **follower's** own choice through
  a leader's navigation in a live session, exactly as `showTr`/`showEn` do.
  It is not broadcast either, so a leader never opens or closes anyone else's.
  That combination — per-session, survives re-render, not synced, not stored —
  is the owner's specification; don't "tidy" it into one of the other two.

**The gathering's response in the Barzanji — a note, not the text (v418 /
v94, both apps).** After each verse the reciter reads, the gathering
customarily answers `صَلَّى اللّٰهُ عَلَيْهِ` or `اللّٰه`. That is now stated
**once, in a note on the Barzanji landing page** (`barzanjiResponseNote()`,
under the section intro), on the owner's instruction — and **nowhere in the
verses.** Do not put a response cue back into the Arabic without the owner
raising it.

It went into the text first and came back out. v412–v417 printed a cue in
the Arabic itself: `(اللّٰه)` on ch.1, then gold `(صَلَّى اللّٰهُ عَلَيْهِ)`
before every rosette, spread to ch.1–18 (skipping ch.4's sung part and the
Concluding Supplication), 78 verses. v418 removed every one and the
`INLINE_INSTRUCTIONS` entry that golded it; the build asserts
`BARZANJI_CHAPTERS` is **identical to v411's** (`6fff593`), the last release
before any cue. Only the inserted, parenthesized cue went — "remove the
salawat" meant that alone, not the text's own ṣalawāt.

What survives from that work and is worth knowing:

- **The phrase is ordinary vocabulary too**: 8 plain occurrences in the
  Barzanji's own narrative, in **chapters 4, 6, 7 and 10** (1, 3, 3, 1). An
  older note said "3, 5, 6, 9" — 0-based indices read as chapter numbers.
- **The fork carries the Barzanji too**, byte-identical data to Mawalid's
  (the source *text* differs by layout only), so a Barzanji change goes into
  both.
- **Every chapter but the last closes on the same ṣalawāt,
  `…صَلِّ وَسَلِّمْ وَبَارِكْ عَلَيْهِ` — 18 chapters.** An anchor on that text
  matches all 18; scope an edit to the chapter's own slice of the file (its
  title to the next chapter's title) and assert one match there. Ch.19, the
  Concluding Supplication, has no closing ṣalawāt.
- **Ch.13 v4** has a rosette straight after a Qurʾānic quotation
  (`…الصَّلَاةْ﴾ ۞`) — anything placed at a rosette lands after the bracket.

---

## Transliteration and Translation

**Both apps, v403. Off for a reader who has never chosen**, on the owner's
call — a chapter opens as the Arabic alone, the way the book reads, with
either column one tap away. They defaulted **on** until v403, so the first
screen of every chapter arrived three deep.

**Whichever way you set them is then remembered** (`mawlid-cols` / `dlk-cols`,
one JSON value holding both) — including turning one back off, not just on.
Written **only from `toggle` and `toggleEn`**, the reader's own chips.

`COLS_KEY` sits above `const state` for the same temporal-dead-zone reason as
`SIZE_KEY`; the build asserts it.

Worth knowing: **a live session does not sync these.** Nothing but the two
chips assigns `showTr`/`showEn`, so a follower keeps their own columns while
following a leader, and persisting from the chips is safe. If a leader is ever
given control of them, that path must **not** write to storage — see the same
trap under *Which reader opens*.

---

## Text size

**Both apps, v403. Study Version only** — the Book Version scales the whole
leaf with `msZoom` instead, so it has no text-size control and must not gain
one. Two sliders, Arabic and Latin, in a `.size-row` of their own so they read
as a pair rather than wrapping one at a time into whatever gap the toggles
leave. They replaced four −/+ chips.

- **The Arabic glyph is `ض`, not `أ`.** The owner could not tell the hamza
  from a bare alif at chip size. Don't put the alif back.
- **Dragging must not reopen the reader.** The size lives entirely in
  `--ar-size` and `--latin-scale`; `applyTextScale()` writes both and is the
  only thing a slider calls. The old chips called `reopen()`, which on an
  `input` event — once per pixel of travel — would throw away the scroll
  position on every frame.
- **`applyTextScale()` is also what the nine openers call.** They each carried
  the same two `setProperty` lines verbatim; that is now one function, so the
  two variables cannot drift apart.
- `renderIndex()` still resets to `1.9rem`/`1` so an index is always default
  size, and a reader re-applies from `state` on open.
- The slider is in **percent** (70–160 Arabic, 80–180 Latin, step 5), matching
  the old chips' limits, so a screen reader announces something meaningful.
- **Remembered across sessions** (`mawlid-size` / `dlk-size`, one JSON value
  holding both). Written **only from `setTextScale`**, the slider's own
  handler — the same discipline `dlk-view` follows, and for the same reason:
  nothing else assigns `state.arScale` or `state.latinScale` today, and a size
  arriving from a live session or a restored screen must not silently rewrite
  how the app opens afterwards.
- **`SIZE_LIMITS` is the one place the bounds live**, because three things
  must agree on them: the slider's `min`/`max`, the clamp on a value read back
  from storage, and the clamp in `setTextScale`. A stored value outside them
  would leave the thumb off the end of its track.
- **`SIZE_KEY` and `SIZE_LIMITS` sit above `const state`**, next to `FAV_KEY`,
  because the state initialiser calls `loadTextScale()`. Defined lower down
  they are in the temporal dead zone and the app throws on load — the build
  asserts the ordering.
- A `latin:true` chapter gets the Latin slider only; at 320px wide the two
  stack, which is fine and is what the chips did.

---

## The script switch — Dalāʾil and aḥzāb, both apps (v96 / v441)

A three-way **Uthmani · IndoPak · Naskh** switch in the reader controls, in
**both** views, sets the reading text (`.v-ar`, `.ms-text`) in one of three
faces. Titles, cards and the rest of the chrome keep Hafs. Fork since v96;
**Mawalid since v441**, owner's call — "the Dalāʾil should be the same
across both apps". In Mawalid it is **scoped to the Dalāʾil and aḥzāb**:
the CSS reads `html.ar-indopak main.paper …`, and `main.paper` exists only
for kinds `d`/`l`, so qasidas, Burdah, Barzanji and every other collection
keep Hafs whatever is chosen. The fork's rule is unscoped (it styles its
Barzanji and Diyāʾ too) — leave that as it is. Code, fonts and `OFL.txt`
header were copied byte for byte from the fork; only the storage keys differ.

| Choice | Face | Licence | Embedded |
|---|---|---|---|
| Uthmani | KFGQPC Uthmanic Hafs (the standard) | KFGQPC terms | as before |
| IndoPak | DigitalKhatt IndoPak v0.1 | OFL 1.1, © Amine Anane, Tarteel Inc. | 101 KB WOFF2 |
| Naskh | Scheherazade New 4.500 | OFL 1.1, © SIL Global, **reserved names** | 125 KB WOFF2 |

- **Scheherazade New is SIL's own web font, byte for byte** —
  `web/ScheherazadeNew-Regular.woff2` from the 4.500 release zip. Its
  licence reserves the names "Scheherazade" and "SIL", so a subset or
  re-encoded copy could not keep the name: never subset or convert it.
  Google Fonts' copy is a subset, which is why it was not used.
- **DigitalKhatt IndoPak** is the project's built "coretext" TrueType
  (`digitalkhatt-js`, `apps/site-angular/src/assets/fonts/coretext/`),
  re-wrapped as WOFF2 with no glyph changes; it has no reserved name.
  It maps only 96 codepoints — the Arabic comma, `؟`, ﷺ, the small wāw
  `ۥ` (4 uses) and the ornate Qurʾān brackets fall through to Hafs/Amiri,
  and the `ۥ` sits slightly apart from its hāʾ. Scheherazade New covers
  everything the corpus uses.
- **Al Majeed was the owner's first choice and cannot ship**: its PDMS
  licence forbids distribution without a licence from pakdata.com. The
  common "Indopak Nastaleeq" fonts carry similar no-distribution terms.
- **The corpus bytes do not change** — every face renders the same text.
- **Switching flips a class on `<html>` (`ar-indopak` / `ar-naskh`) and
  re-fits in place** — no `reopen()`, so neither view loses its leaf or
  scroll. `queueMsAutoFit` also waits on `document.fonts.load()` for the
  chosen face (`AR_FONTS` maps choice → family), because `fonts.ready` can
  settle before a just-chosen face starts loading. Measured: zero
  overflowing leaves across every Dalāʾil and litany chapter in all three.
- **`dlk-font` / `mawlid-font`** (`uthmani` | `indopak` | `naskh`), written only from
  `setArFont`. **Unset means the version's default (v98, owner's call):
  IndoPak in the Mughlay Version, Uthmani in Istanbul** — `defaultArFont()`,
  and `setDalailEdition` swaps it on a switch (`showArFont`) for a reader
  who has never chosen. Any tap on the script switch is a choice and is
  stored, even on the script already showing, and then holds in both
  versions. It is app-wide, so the litanies follow it too. Not synced in a live session and
  not broadcast — a follower keeps their own script, like size and columns.
- All three OFL notices (Amiri, DigitalKhatt, SIL) head `OFL.txt` in both apps.
- Measured in Mawalid (v441): 272 Dalāʾil and litany leaves, zero overflow in
  all three scripts in both versions.

## Two versions of the Dalāʾil — both apps (v426 / v97)

On the owner's request **both apps** offer the Dalāʾil in **two versions**, switched by an **Istanbul · Mughlay** control **on the
Dalāʾil landing page only** (v427 / v98, owner's call — it used to sit in the
reader controls too; `editionSwitch()` is now called from the landing page
alone, and `dalailHasEditions` no longer gates anything visible).
**The owner named it the Mughlay Version** (September 2026) after the
Indo-Pak "Mughlay" printing it resembles. The code still says `sayyidina`
(`DALAIL_WITH_SAYYIDINA`, the stored value) — only the label changed.
**It is being collated against that printing, day by day** — the owner's
rule is that the Mughlay Version **follows the Mughlay printing exactly**,
as Istanbul follows its own. Monday P1, Tuesday and Wednesday are done (see *The
Mughlay printing* below); the other days still carry the reconstructed
pre-collation text.

- **Istanbul** is `DALAIL_CHAPTERS` as it stands: collated against the
  printing, with the 520 سيدنا removed and its Arabic commas.
- **Mughlay has no Arabic commas** (owner's call): every U+060C is
  dropped from the Arabic of the whole Dalāʾil as the version is applied
  (`stripArCommas`) — 1,065 of them, all written `word، next`, so each
  leaves one space. `tr` and `en` keep their punctuation. The stored
  alternates keep their commas; the stripping happens only at apply time.
- **Mughlay** is `DALAIL_WITH_SAYYIDINA`, a map `"chapter:verse" →
  {ar, tr, en}` of the **153 verses** the eight splice commits changed
  (Mawalid `944d5da`…`d081b83`; fork `a97fb1d`…`76b865b`), each restored to
  its pre-collation text **but carrying every fix made since** — Saturday
  v15's `شِيثَ` / "Shītha" and the two `إِبْرَاهِيمَ` tatweels. The build
  asserted, verse by verse, that the two versions differ by exactly the
  collation's own changes and nothing else; that every `۞` and `‖` is where
  it was; and 520 restored: Mon1 119, Tue 35, Wed 25, Thu 63, Fri 134,
  Sat 94, Sun 28, Mon2 22.
- **Plus 200 more: `سَيِّدُنَا` before each Name of the Prophet** (`[5]`
  v2–v201, Aḥmad … Ṣāḥib al-Faraj), Mughlay only, on the owner's
  call — so the map held **353** entries (369 after Monday's collation, 500
  after Tuesday's, 537 after Wednesday's: every verse of those days now has one, for the English). This one is **new text, not a
  restoration**: no copy of the app ever carried it there, and the
  Istanbul Names pages were never uploaded, so Istanbul was left alone.
  `tr` "Sayyidunā Aḥmad" (`Sayyidunā n-najmu th-thāqib` for v98), `en`
  "Our master, most praising of Allah" (proper names `Ṭā Hā`/`Yā Sīn` keep
  their capital). The bytes are Saturday v21's — the Dalāʾil's only
  nominative `سَيِّدُنَا`, shadda-before-kasra like the 433-strong majority
  of `سَيِّدِنَا`. v1's `مَنِ اسْمُهُ مُحَمَّدٌ` is inside the duʿāʾ and takes none.
  Still 5 leaves, zero overflow in every script.
- **Any future fix to one of those 500 verses must go into both** —
  `DALAIL_CHAPTERS` and its entry in `DALAIL_WITH_SAYYIDINA`. The alternate
  is a full copy of the verse, not a patch, so a fix made to one alone
  silently diverges. Check `DALAIL_WITH_SAYYIDINA["c:v"]` before closing
  any Dalāʾil text edit.
- **The swap is in place**: `applyDalailEdition()` writes the chosen
  fields onto `DALAIL_CHAPTERS` at startup and on every switch, from
  `DALAIL_WITH_SAYYIDINA` or from `DALAIL_ISTANBUL` (a startup snapshot of
  the same verses). So both readers, search, saved places and live
  sessions follow the version with no knowledge of it. `DALAIL_ISTANBUL`
  snapshots every Dalāʾil verse (the comma strip touches them all). The
  **source** `DALAIL_CHAPTERS` is never edited, and it and
  `DALAIL_WITH_SAYYIDINA` are byte-identical between the two apps.
- **Verse indices and leaves are identical in both; segments are not.** The
  `‖` page breaks are Istanbul's in both versions, but where the Mughlay
  printing has been collated its **rosettes follow that book** (owner's
  call), and rosettes are what `segWrap` splits phrases on. So a phrase —
  and a saved place — in one version is a different phrase in the other.
  **Saved places are kept per version**: `placeKey()` returns `PLACE_KEY`
  for Istanbul (the old key, so existing places survive) and
  `PLACE_KEY + '-mughlay'` for Mughlay. The landing page's resume card is
  redrawn on a switch, Clear wipes both, and every switch shows a short
  note (`editionToast`) that places and highlights are kept separately.
  **Gold-ring highlights are per version too** (owner's call): the
  Dalāʾil's `d:` marks for Mughlay live in `mawlid-marks-mughlay` /
  `dlk-marks-mughlay`; Istanbul's stay in the original store, and every
  other collection's marks share that store whichever version is on.
  `loadMarks()` shows the current version's `d:` marks only, `markVerse`
  writes through `markStoreFor(kind)`, Clear empties both. These are
  function declarations reading `dalailEdition` through a try, because
  marks and places can be read before it is declared. A leader and
  follower on different versions still reach the same leaf and verse.
- **`noRosette` travels with the version**: an alternate may carry its own
  (Monday v44 closes bare in the Mughlay); `DALAIL_ISTANBUL` snapshots it
  and `applyDalailEdition` restores it.
- **Switching re-renders an open Dalāʾil reader**: the Book view keeps the
  **leaf** (`msCurrentPage` → `msGoToWhenReady`) — going via the top verse
  landed a leaf early whenever a verse ran on from the previous page; the
  Study view keeps the top verse.
- **`mawlid-edition` / `dlk-edition`** (`istanbul` | `sayyidina`; unset or
  unrecognised = Istanbul), written only from `setDalailEdition`. Not synced
  in a session.
- Measured in both apps: zero overflowing leaves in the Mughlay
  version (all three scripts in the fork); leaf counts, `۞` (478) and `‖`
  (103) unchanged; saved places resume across a switch both ways.

### The Mughlay printing — what Monday P1 showed

`Dalail-al-Khayrat-urdu-eng-monday.pdf`, 20 pages: Arabic on the even book
pages 98–116, English on the odd ones. Indo-Pak script with a text layer
that is useless, like the Istanbul scan's. It marks a `○` at the end of
almost every one of the app's verses, which suggests the app's verse
chunking came from this edition or one like it. Its internal divisions are
far fewer than Istanbul's rosettes (none inside v2–v4, v23, v45, v48–v52).

Collated word by word against the app's Mughlay Version and the Istanbul
scan (pp.19–31). **Applied on the owner's rulings (both apps):**

- **Six سيدنا out of the Mughlay Version** where this printing is bare:
  v39 (only the last `وَصَلِّ عَلٰى مُحَمَّدٍ عَدَدَ مَا خَلَقْتَ` — the other four
  keep it), v43 ×2, v45, v47 ×2. v43/v45/v47 then equal Istanbul, so their
  alternates were **deleted** from the map, not edited.
- **Each version follows its own book where the two printings differ**
  (the alternate carries the Mughlay reading, Istanbul is untouched): v15
  `لِطَاعَتِكَ` (Istanbul `بِطَاعَتِكَ`); v23 `كَمَا تُحِبُّ` / "as You love him"
  (Istanbul `يُحِبُّ`); v35 `آمَنْتُ بِسَيِّدِنَا مُحَمَّدٍ` (Istanbul `بِهِ`) — a new
  alternate; v42 no `لَهَا` (Istanbul keeps it) — a new alternate.
- **Fixed in both versions to what both printings have**: v3 `وَعَلٰى آلِ
  مُحَمَّدٍ` (was `وَآلِ`); v17 `عَلَيْهِ السَّلَامُ` (the app had `وَعَلَيْهِ`);
  v44 `إِنْ شَاءَ اللّٰهُ تَعَالٰى` / "Allah Most High willing", and its `صَلَى`
  given its shadda (bytes copied from v45).
- Bytes: `وَعَلٰى` from v3 itself, `تُحِبُّ` from v26, `صَلَّى` from v45,
  `بِسَيِّدِنَا مُحَمَّدٍ` from the alternate of v33, `تَعَالٰى` the corpus's
  dagger form (4 of 6). `لِطَاعَتِكَ` has no copy anywhere — it is v15's own
  `بِطَاعَتِكَ` with the bāʾ swapped for a lām.
- **Rosettes follow the Mughlay printing** (owner's call, second pass).
  It marks a `○` at the end of every verse but one — v44, the
  instruction, closes bare, so its alternate carries `noRosette` — and
  inside only five: v17 ×2 (after `عَظِيمٍ` and after the āyah; not before
  `عَلٰى سَيِّدِنَا مُحَمَّدِ بْنِ`), v30 ×3, v31 ×4, v38 ×3 (after `وَرَسُولِكَ`,
  `وَنَجِيِّكَ`, `وَسَمَائِكَ`), v39 ×3 (not after `بَنَيْتَهَا`). Every other
  internal rosette came out. Book leaf: 66 rosettes against Istanbul's 105,
  per leaf `5,6,3,4,4,6,13,6,4,6,2,3,4`. Read off the page and checked at
  zoom where unsure; a ring detector was tried and is too noisy to trust.
- **English from the book's facing pages**, all 53 verses, transcribed
  from the images (the text layer mangles "Allah" as "Allak"/"Atlah" and
  shuffles lines). Verbatim — archaic ("Thou didst", "burthen"), including
  where the English keeps "our master" over Arabic the book prints bare
  (v39, v45, v47) — except: the book's "O Allah." is written "O Allah,";
  "untill" → "until"; v17 "let those who believe, as Allah" → "ask Allah";
  a verse's closing comma or colon ends in a full stop. `tr` is unchanged.
- Spelling only, not changed: the Mughlay writes `رِضَا` / `رِضٰى` where
  Istanbul and the app have `رِضَاءَ`.

Still 13 leaves in both versions, zero overflow in every script.

### The Mughlay printing — Tuesday (v440 / v101, both apps)

`Dalail-al-Khayrat-urdu-eng_Tuesday.pdf`: Arabic on book pp.120–138, English
on 121–139. Collated word by word, each difference checked against the
Istanbul scan (pp.32–43); audit in `findings/tue-mughlay.md`. Owner's
rulings, all applied:

- **v104 bare** (`رَسُولِكَ أَبِي الْقَاسِمِ`) — its سيدنا is out; the Arabic
  now equals Istanbul's. The other eight alternates' سيدنا are all printed.
- **Each version follows its own book** where the printings differ (the
  alternate carries the Mughlay reading): v5 `يَا رَبَّ الْعَالَمِينَ` (Istanbul
  `أَرْحَمَ الرَّاحِمِينَ`), v6 `وَالْحَرَمِ` (`وَالْحَرَامِ`), v16 `الرُّعُودِ لَكَ إِذْ`
  (`ذَاكَ`), v45 `مَوْلَى النِّعْمَةِ` (`مُولِي`), v46 `مُولِي الرَّحْمَةِ` (`مُؤْتِي`),
  v81 `بِأَفْصَحِ الْكَلَامِ` (`كَلَامٍ`), v112 `صَاحِبِ خَوَارِقِ` (`الْخَوَارِقِ`).
  v45 was not named in the ruling and follows the standing rule. `tr`
  moved with each.
- **Fixed in Istanbul to its own printing**: v81 `كَلَام` → `كَلَامٍ`; v112
  `لِخَوَارِقِ` → `الْخَوَارِقِ` (the scan's lām carries sukūn — the article,
  not the preposition); v133's `وَعَلٰى آلِ إِبْرَاهِيمَ` removed (see *Known
  open items*).
- **Rosettes follow the Mughlay printing**: 13 internal, against the app's
  27 — v3 ×5, v11, v16 (only after `الْمَجِيدِ`), v130 ×5 (none after
  `إِلَّا لَكَ`; new ones after `زُورًا` and `فُجُورًا`), v133. Every verse
  closes with one. Its `○ ثلاثا ○` in v131–v132 stays the app's `(3)`.
- **English from the facing pages**, all 140, on Monday's conventions,
  plus two press typos corrected: "Footstall" → "Footstool" (v16),
  "sparking" → "sparkling" (v86). Counts are written `. (3)` as the app
  already did. The book's English keeps "our master" where the Arabic is
  bare, and in v5 renders both `أَرْحَمَ الرَّاحِمِينَ` and `رَبَّ الْعَالَمِينَ`.
- Istanbul's own `en` for v5 still says "O Lord of the Worlds" against
  its `أَرْحَمَ الرَّاحِمِينَ` — flagged, not changed.
- Spelling only, not changed: v124 `الْمُؤَيَّدِ` (app `الْمُوَيَّدِ`), v133
  `رِضٰى` (app `رِضَاءَ`).
- Bytes: `وَالْحَرَمِ` and `مَوْلَى` copied from the corpus; `رَبَّ` from v6,
  `الْعَالَمِينَ` from v128, `لَكَ` from v16 itself, `مُولِي` from v45; `الْ`
  taken from v112's own `الْعَادَاتِ`. The one typed anchor (v104's
  `سَيِّدِنَا`) silently failed on mark order and the build's assert caught
  it — anchor on the bare form.

14 leaves in both versions, zero overflow in every script.

### The Mughlay printing — Wednesday (v444 / v102, both apps)

`Dalail-al-Khayrat-urdu-eng_short_Wednesday.pdf`: Arabic on book pp.142–162,
English on 143–163. Collated word by word, each difference checked against
the Istanbul scan (pp.46–58); audit in `findings/wed-mughlay.md`. Every سيدنا
the alternates carry is printed — none removed. Owner's rulings, all applied:

- **Fixed in both versions** (both printings agree against the app): v10's
  `(3)` removed (neither book repeats it; Istanbul's `(recite three times)`
  went from `en` too), and Istanbul v10 also lost `أَفْضَلَ`, which its
  printing lacks (`en` "with what You have rewarded"); v21 `عِنَايَتِكَ` (was a
  stray sukūn); v28 `مَا كَانَ وَمَا يَكُونُ`; v33 `تُبَلِّغُنَا` with no `وَ`;
  v39 `الْأَمْوَاجُ` (ḍamma). And, reported by the owner reading the app,
  v39 `وَالتَّبْلِيغِ` — the bāʾ had no sukūn.
- **Mark slips, both versions, owner's call**: v26/v38 `اللّٰهمَّ` and v31
  `اللّٰهُمَ` → `اللّٰهُمَّ`; v31 `وَبَارِْك` → `وَبَارِكْ` (both copied from the
  corpus majority); v38 `وَالكَؤْثَرِ` → `وَالْكَوْثَرِ`; v39 `الْأَبْحُرِ`,
  `تَلَاطَمَتْ`; v42 `وَأَكْمَلِ`; v43 `وَأَعْلَاهُمْ` (its sukūn sat alone as a
  word); v26 `آلِهِ`. Each now matches the bytes the corpus already uses.
- **Each version follows its own book** (the alternate carries the Mughlay
  reading): v3 adds `وَبَارِكْ`; v7 `بِتَاجِ الْعِزِّ وَالرِّضَاءِ` (the app's
  `رِضَاءِ` spelling kept); v23 `تُنَجِّينَا` (Istanbul `تُنْجِينَا`); v34 has no
  `وَعَلٰى آلِ سَيِّدِنَا مُحَمَّدٍ`; v42 `أَعْظَمِ` with no `وَ`; v43 has no second
  `وَأَوْفَاهُمْ عَهْدًا`.
- **Rosettes follow the Mughlay printing**: 70 internal against the app's 72
  — none at all in v4, v8, v15, v23, v25, v31–v34; v19 after `مَجِيدٌ`
  (not after the first `إِبْرَاهِيمَ`); v42 25 and v43 11, almost one per
  epithet. Its `○ ثلاثا ○` in v9/v11 stays the app's `(3)`.
- **English from the facing pages**, all 44, on Monday's conventions.
  Press typos corrected: "Thorne" → "Throne" (v11), "Secretes" →
  "Secrets" (v17). In v43's long list a line-initial capital after a comma
  is lower-cased. The book's English keeps "and to the Family" in v34.
- **The "ابْتِدَاءُ الثُّلُثِ الثَّانِي" heading before v31.** The Book Version
  already drew it from v31's `band`; the Study Version showed nothing,
  because it renders `v.note`, not `v.band`. v31 now carries the heading as
  its `note` too, as Tuesday's v129 does. The other verse `band`s —
  Thursday's rubʿ and Saturday's thulth and rubʿ — are still Book-only.
- Spelling only, not changed: `رِضًى`/`رِضٰى` (v4, v19, v24), v8 `مَسْؤُول`,
  v19 `بَقِيَ`.
- Bytes: `وَمَا` and `وَبَارِكْ` and `الْعِزِّ` the corpus's majority forms;
  `تُنَجِّينَا` built from v23's own word with the shadda/kasra order of its
  `صَلِّ`. Two typed assertions failed on mark order and the bare-form
  helper had `ة→ي`; all three were caught before anything was written.

13 leaves in both versions, zero overflow in every script.

## The top of a reader — Dalāʾil and aḥzāb only (v427–v428 / v98–v99)

**Scope, twice restated by the owner: this applies to the Dalāʾil and the
aḥzāb (kinds `d` and `l`) in both apps, and nowhere else.** `readerHTML`
sets `compact = kind === 'd' || kind === 'l'`. v427 shipped the Aa panel and
the slim About · Listen row to every reader; v428 put every other
collection back exactly as it was (verified: the qasida, Burdah, Barzanji
and Diyāʾ tops render identically to v426/v97). The script switch reached
Mawalid's Dalāʾil and aḥzāb in v441 (see *The script switch*); the rest of
Mawalid has none.

In the Dalāʾil and aḥzāb:

- **Book / Study is chosen from the labelled pair under the title again**
  (v429 / v100, owner's call — the bar-only icon was too easy for a new
  reader to miss). `.view-switch` with "Book Version"/"Study Version" sits
  in `.controls`, inside the `hasPages` block, so only the Dalāʾil and
  litanies show it (the only two collections with folios). The small
  `.view-swap` icon in the green bar is back to hiding until the bar goes
  slim (`.reader-bar:not(.slim) .view-swap{ display:none }`) — it reappears
  once a reader scrolls into the leaf, so the view can still be swapped
  without scrolling back up.
- **The controls row keeps only what is used while reading**: Save my place
  (Dalāʾil, Book view), Two pages (wide screens), full screen (Book view),
  and **`Aa`**.
- **`Aa` opens a panel in place** (`toggleAa`, `state.aaOpen` — in memory
  only, never stored, and never through `reopen()`) holding the settings a
  reader sets once: the script switch, Transliteration and
  Translation, and the two text-size sliders (Study only). In the Book
  view it holds the script switch alone. A column toggle re-renders the
  reader; the panel stays open because the flag lives on `state`.
- **The chapter note is hidden** (v428 / v99, owner's call, "so if I change
  my mind we can show it again"): `SHOW_CHAPTER_NOTES = false` in
  `readerActions`. Set it to `true` and the note returns as a small
  "About · نُبْذَة" button that opens it beneath (a short note just shows);
  that path was tested with the flag on. The notes are untouched in the data.
- **Listen is the full-width bar again** (v428, "make it wider again" — v427
  had made it a small button). In the Book view it sits in `#ms-tune`,
  offered from the first leaf only, and now follows the Listen rule above
  (a recording **or** a video; the old Book wrapper had needed a video).
- **The version switch is on the Dalāʾil landing page only.**

## Theme

**In the Dalāʾil and the aḥzāb the Study card is printed on the Book
Version's paper** (owner's call, both apps): `main.verses` carries `paper`
for kinds `d` and `l`, which sets `--verse-bg` (`--ms-paper`), `--verse-bg2`
and `--verse-edge` (a `--rule-soft` gold hairline). `.verse`, a refrain's
gradient, an instruction card and an opened repeat panel all read those
variables and fall back to the white `--card` elsewhere. **Every other
collection keeps its white cards** — the first pass put every Study reader on
the paper and the owner had it limited to the Dalāʾil and aḥzāb. The paper was briefly darkened (`#F6ECD2`) and the owner had
the Book Version put back to its original `#FBF4DE` the same day, with the
cards matching it — so the leaf colour is unchanged from before and only
the cards moved. A refrain's gradient runs to `--ms-paper-deep`, and so does an opened
"Repeat refrain" panel (v427 / v98), which had been left white. In the dark theme the card
follows the dark leaf the same way. The page behind the cards (`--bg`) and
the app's other white cards are unchanged.

**Light is the standard first-open look.** A reader who has never chosen gets
light whatever their phone's system setting says; dark is only ever entered by
tapping the toggle, and only then is it remembered (`mawlid-theme` /
`dlk-theme`). `initTheme` deliberately does **not** consult
`prefers-color-scheme` — it used to, which handed anyone with a dark phone a
dark app before they had asked for one. Owner's call; don't reintroduce it.

---

## Previous / Next chapter

**Both apps, v401. Study Version only — do not put it back in the Book
Version.** A worded Previous/Next pair at the foot of the Study reader, so a
mawlid can be read straight through without returning to the index. Hidden in
full screen with the rest of the furniture.

It shipped in v400 in *both* readers and the owner had it taken out of the Book
Version in v401: there it added a second navigation idea to a page that already
carries leaf arrows and dots, and took room the leaf needs. The Book Version's
own carry-on — the next arrow opening the following chapter from the last leaf
— predates this work and stays.

**Only the Dalāʾil (15/15 chapters) and the litanies (16/18) have `folios`, so
only they have a Book Version at all.** Every mawlid collection — Barzanji,
Burdah, Sīrah, Diyāʾ — and the qasidas, ilāhīs and qawwalis are Study-only,
whatever `state.pageView` says, because the renderer gates on
`hasPages && state.pageView`. Worth knowing before reasoning about where a
reader-level control will show up.

`neighbourPiece(kind, idx, dir)` is the one definition of "the next chapter
that actually has verses" — it skips unfilled scaffolds such as the litany
title slots, which are hidden from every index and would otherwise strand the
reader on blank placeholders. It takes kind/idx rather than reading `msPiece`,
because `readerHTML` needs it while building a page, before `msPiece` has been
set for that piece. `nextPiece()` delegates to it, so the Book Version's
carry-on from the last leaf follows the same definition.

**The Dalāʾil's chain is bounded by group (v409 / v86).** `DALAIL_GROUPS` is
`[[1,5],[6,14]]` and `neighbourPiece` keeps kind `'d'` inside whichever group
the chapter is in — the same two groups the Dalāʾil index already shows. So the
before-reading sequence runs Opening Duʿāʾ → Names of Allah → Seeking Refuge →
Sayyid al-Istighfār and **closes on the Names of the Prophet** rather than
tipping the reader into Monday's portion; the week still carries on to the
Duʿāʾ of Completion. `[0]`, the About page, is in neither group: its own Next
leads into the sequence (unbounded, because `dalailGroup` returns null) but the
sequence never sends a reader back to it. This also bounds the Book Version's
leaf carry-on, which is the point — the next arrow on the last leaf of the
Names of the Prophet is now the end of the reading, not a door into Monday.

**And the before-reading group — only that group — carries the worded pair in
the Book Version too (v409 / v86), on the owner's call.** `msChapNav(kind, idx)`
renders it under the leaf arrows, **on every leaf of those chapters**. It
shipped gated to the chapter's last leaf and the owner had that taken out in
v410 / v87: a reader wants to see where the reading goes next without paging to
the end of the one they are in. That gating is what `msSyncChapNav()` existed
for, so it went with it rather than stay as dead code — along with its calls
from `msSyncDots`, `queueMsAutoFit` and the resize handler. `.ms-chap` now
carries no CSS of its own; it is only the hook the immersive list and the tests
use. The pair reuses the `.chap-nav` markup, which is already in the
`html.immersive` hide list, so full screen hides it for free.
The v401 reasoning still holds everywhere else: no worded pair on a daily
portion, a litany, or any other Book chapter.

Worth knowing about the placement: the leaf is **taller than the viewport**, so
the static dots and arrows already sit below the fold — that is why a **fixed**
`#ms-float` arrow pair exists. The worded pair sits below the dots, so a reader
reaches it by scrolling past the end of whichever leaf they are on.

The buttons are laid out left-to-right, unlike the leaf arrows, which point the
way an Arabic book turns (`‹` is *next*). These are worded controls, so they
follow the words.

---

## Back, and coming back

**Both apps, v399 / v76.** The manifest is `display:standalone`, so on Android
there is no browser chrome and Back is the system gesture. The app pushed no
history of its own, so Back closed it outright however deep you were reading.

A screen is fully described by `state.tab`, `state.burdahChapter` and whichever
piece is open, so each navigation pushes that descriptor and Back pops it. Back
closes what is on top first — full screen, then an open leaf menu, then the
previous screen — and from home it falls past the baseline entry and lets the
platform close the app, which is why the baseline is always home.

Three things here are load-bearing:

- **Whether a reader is open is read off the page, never from `msPiece`.**
  `msPiece` is set when a reader opens and is *never cleared*, so it still names
  a chapter long after you have gone back to an index. `renderedView()`
  documents the same trap.
- **The push in `onNavigated` sits AFTER the `suppressNavSignals` gate.** That
  flag is already set by `reopen()` and by remote-driven navigation, so putting
  the push below it is what stops a translation toggle, or a follower being
  moved by the leader, from filling the history with entries.
- **Intercepting a Back must re-push.** Leaving full screen or closing the menu
  consumes the pop; without `pushLoc()` afterwards the next Back would skip a
  whole screen.

Coming back to the app restores where you were within **30 minutes**
(`mawlid-last` / `dlk-last`, saved on `visibilitychange`→hidden and on
`pagehide`). This is *not* the Dalāʾil's "Continue where you left off", which is
an explicit bookmark and permanent; this one is automatic and expires. A session
link always wins over it, and a saved descriptor naming a chapter that no longer
exists is dropped by `locValid` rather than handed to an opener — `readerHTML`
would throw on a missing index and the app would come up blank.

Note there are now **two** `visibilitychange` listeners: the pre-existing one
that calls `sessionWake()` on becoming visible, and this one that saves on
hidden. Different conditions, no conflict.

---

## Which reader opens

**The two apps deliberately differ here — do not "sync" them.**

In the **Dalāʾil fork** (v75) the Book Version is the standard view and Study
the alternative, and **the last one chosen is remembered** (`dlk-view`; unset
means Book). Owner's call. `state.pageView` already defaulted to Book in
memory — what was missing was persistence, so leaving the app in Study dropped
you back into Book on the next open.

The preference is written **only from `setPageView`**, the reader's own toggle.
Two other places assign `state.pageView` and must not persist: `applyRemoteNav`
forces a follower into the leader's view, and `resumeDalail` takes it from the
saved bookmark. Storing either would let a session you joined, or a place you
resumed, quietly rewrite how the app opens afterwards. Both are covered by the
battery.

**Mawalid is unchanged** — Book in memory, nothing stored — because the owner
asked for the Dalāʾil fork only. Mirroring it there is a one-line change if
they ever want it.

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

**Open question, surfaced by the v398 dead-code removal.** The `present` handler's
only action on leader state was `if(session.leaderPending) clearLeaderPending(…)`,
and that flag was never set — so **a peer vouching that the room is occupied has
never cleared a follower's `leaderless`**. The removal preserved that exactly
rather than quietly re-pointing the test at `leaderless`, because that would be a
behaviour change in the subsystem this section exists to warn about, not a
cleanup. Whether a `present` *should* pull a leaderless follower back to
following is **the owner's call.**

---

## Mawlid ad-Daybaʿī — the Opening Qasida

**`QASIDAS[3]`, v402.** Verses **8–11 and 20–23** open `اللّٰهُمَّ صَلِّ` where the rest of
the qasida opens `يَا رَبِّ صَلِّ` — the owner's reading. Verse numbers **count the
refrain as v1**, which is how the reader numbers them (`toArNum(n+1)`), so those
are array indices 7–10 and 19–22.

Three things worth keeping:

- **Only the first hemistich changes.** Each verse is `… ۞ يَا رَبِّ …`; the
  second keeps `يَا رَبِّ`. v23 carries the phrase **twice** (its second hemistich
  repeats the refrain's), so an anchor that asserts "exactly one occurrence"
  fires wrongly there — anchor on the verse **opening** instead.
- **`en` did not move, and that is correct.** In this qasida only v1 translates
  both hemistichs; v2–v23 translate the **second** only, because the first is the
  unvarying refrain line. So the eight verses' English never mentioned
  `يَا رَبِّ صَلِّ` and had nothing to change. If a report counts that as `tr`/`en`
  drifting out of step with the Arabic, the report is wrong.
- The `اللّٰهُمَّ` bytes were **copied from v24 of this same qasida**, which already
  carried them — the app's majority form (629 of 962) and NFC-canonical. Note
  the mark order: lām takes shadda-then-dagger, mīm takes **fatha-then-shadda**.
  A hand-typed needle got both this and `وَسَلِّمْ` backwards during the build.

The refrain carries the house repeat marker `" (2)"` on all three columns — not
`2x`; `INLINE_INSTRUCTIONS` golds it inline.

The recording is `Ya Rabbi Salli Ala Muhammad.mp3` (Aashiq al-Rasul, 240 s).
**`QASIDAS[27]` is a near-duplicate of this qasida and was not touched.**

## Allāhumma Ṣalli ʿalā Muḥammad — `QASIDAS[24]`

**v429–v430, Mawalid only** (issues #22 + #26, the user's rulings). #6 in
the Qasida list on screen (the Burdah card is #1).

**The source is the user's printed booklet**, `lyrics/qasida/Qasida_V1.3.pdf`
in `abdulmajid1993/qasida`, book pp. 3–4 (PDF pp. 8–9): fully vowelled, 17
verses and a closing `اللّٰهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَيْهِ`. The earlier text came
from the Sacred Lyrics export and was **corrupt**: 16 verses, two hemistichs
lost, the next verse glued onto `وَالْجُنْدُ`, and a line
(`والذين آمنوا إلا فاه محمد`) that is in no printing. Check this booklet
before trusting the export for any other piece it supplied.

- Layout: refrain · pairs 1–14 · v15 alone · v16 + v17 + closing, all nine
  flagged `repeatRefrain` (after the last too, on the user's call).
- **Pausal `مُحَمَّدْ`** closes every first hemistich, as sung — the printing
  gives full case endings there; the user chose pausal. **`بَيَّنَ`** (v12)
  follows the printing over the user's paste.
- House spellings over the printing's: `الدُّجَى`, `الْإِلَهُ`, `عَلٰى`, `إِلَى`,
  `أَرْجُو`, `أَعْلَى`. `مَنْجًا وَمَلْجَاءُ نَا` keeps the printing's split `نَا`.
- English: six verses are the user's; the rest (3, 7–11, 13–17, closing) is
  in-house, approved as drafted. v11's `تَحَشَّمْ` ("through him we keep our
  honour") is the least certain line.

## Madad — the Naqshbandi Golden Chain, `QASIDAS[26]`

**v431, Mawalid only** (issue #23, the user's rulings). Source: the same
booklet, book pp. 13–14 (PDF pp. 18–19), which has a **real text layer** on
these Naqshbandi Nazimiya pages — characters can be read off it, unlike the
image pages. One card per group, **breaking where the booklet prints
"Chorus"** (6,6,6,6,6,4,5), `repeatRefrain` on every card; the Mahdī couplet
card is gone.

- **Booklet spellings, exactly, where it differs** (user's call): `شَاهِ`,
  `عَطَّارُوْ`, `ذَاهِدِيْ` (a likely typo for زاهدي — kept on purpose; `tr`/`en`
  say Zāhidī, as the booklet's own transliteration does), `يَرَأْغِيْ`,
  `صَاحِبُ الْوَقْتِ`, `فَرْدَانِيْ`. A mark the booklet merely omits is not a
  difference: `حَقَّانِيْ` keeps its shadda.
- **The end departs from the booklet on the user's instruction**:
  Sulṭān al-Awliyāʾ · Shaykh Nāẓim · Ḥaqqānī | Ṣāḥib al-Waqt · Ṣāḥib az-Zamān ·
  Imām Mahdī | Fardānī … Ghawth al-Anām, a chorus after each. Sulṭānī became
  Sulṭān al-Awliyāʾ; Shaykh Hishām, Shaykh ʿAdnān and Shaykh Muḥammad ʿĀdil
  were **removed**, and the closing `مُحَمَّدُ الْمَهْدِيُّ خَلِيفَةُ اللّٰهِ` couplet
  with them. Do not restore any of it from the booklet.
- The duplicate Ṣiddīqūn and the ‑ū forms (Qāsimū, Ṣādiqū, Khiḍrū, Darwīshū)
  are genuine — the booklet has them.
- `en` is "Support us, O …" per line, names in their usual English form
  (Sayf ad-Dīn, Imām al-ʿĀrifīn); the refrain's "Aid…" became "Support us…".

## Qamarun — `QASIDAS[23]`

**v432, Mawalid only** (issue #26). Vowelled from the booklet, book p. 2
(PDF p. 7, an image-quality text layer — read at zoom, not extracted).
User's rulings: the **booklet's words, completed where its own
transliteration shows the Arabic cut short** (`وَعِطْرُهَا` for printed
`وَعِطْرُهَ`, `الْبَرَايَا` for `الْبَرَى`; `نَوَالُهَا`, `بِنُورِ`, and the refrain's
three قَمَرٌ / وَجَمِيل as its transliteration sings them); its **vowels as
printed, ungrammatical ones included** — `ظِلُّ لَّهُ`, `تَنَالَ الشَّمْسَ …
وَالْبُدُورَ`, `أَنَارُ`, colloquial `سِيدْنَا`. Do not "correct" these.

Its repeat marks went in too: the bracketed X2 on the refrain and on lines
2 and 4 is **`times: 2`** — the label now reads "Sing the whole *verse*
twice" on a non-refrain card (same element, `refrain-times`); X3 on the
first hemistich of lines 3 and 5 is an inline `(3)`; and the sung response
**`(اللّٰهْ اللّٰهْ)`** is golded by its own `INLINE_INSTRUCTIONS` entry.
This is the booklet's text, unlike the Barzanji cue the owner had removed.

## Madad Madad (Burdah interlude) — `QASIDAS[35]`

**v433, Mawalid only** (issue #26), approved from a rendered preview. The
old 3 verses were a corrupt import (`قلول القلوب…`). The booklet (pp. 50–51,
PDF 54–55) has **transliteration and English only**, so the Arabic and all
its vowels were **rebuilt in-house** from that transliteration and the
well-known texts: the poem `كُلُّ الْقُلُوبِ إِلَى الْحَبِيبِ تَمِيلُ`, the al-Madad
chorus (refrain), five Madad verses, then lines of al-Munfarija under their
own refrain `يَا رَبِّ بِهِمْ وَبِآلِهِمِ ۞ عَجِّلْ بِالنَّصْرِ وَبِالْفَرَجِ` (a second
`refrain`, so later repeats use it). Refrain breaks follow the booklet's.
Least certain: `بِلِقَا`, `بِمَدْحِكْ تُجْلَى الْأَقْدَارْ`, `بِخَوَاتِمِهَا`. **One
Munfarija line the booklet marks "(?)" is deliberately omitted**
("la kinni bi shudika muʿtharifun…") — add it only from a real source.
English is the booklet's, lightly regularised ("O", capitals, half-lines
joined).
**It carries no `note`** (v434), and neither do `QASIDAS[24]` or `[26]`:
the user removed all three notes Claude had written or rewritten in
v430–v433 without being asked. Do not add or reword a chapter note unasked.

## Balagha-l-ʿUlā bi-Kamālihi — the Arabic qasida

**`QASIDAS[41]`, v411. Mawalid only** — the fork's `QASIDAS` is a stale
25-entry subset outside its Dalāʾil-and-aḥzāb scope, so it was not touched.
Not to be confused with the **qawwali** of the same name in
`QAWWALI_CHAPTERS` (Urdu/Persian/Arabic, Latin script), which also stands.

The owner supplied **two** Arabic texts that disagree, plus their own English.
Settled word by word, **the owner's English as the tiebreaker**, and approved
by the owner before it was written:

- Refrain: `بَلَغَ` (form I, "reached" — not `بَلَّغَ`), `صَلُّوا` (not `صَلَّوْا`,
  which does not parse). Matches the text as published elsewhere.
- v1 `الْمُتَأَلِّقِ … الْبَهَاءِ … لَمْ يُلْحَقِ` ("radiant … splendour …
  unsurpassed"). The second source's `الْمُثَالِي … إِلَهٍ … لَمْ يُلَحْ` fits
  neither the English nor the line, and its last word reverses it.
- v4 `بِعُرَاكَ` ("your firm handhold") over `بِغَرَضِكَ` ("your purpose").
- v5 `لِلثَّقَلَيْنِ` — **both** sources had it wrong (`لِلتَّقَلَيْنِ`, `لِلْقَلَيْنِ`);
  confirmed against outside text. v6 `مُهَيَّمًا`, `دَهْرَهُ` (the latter the
  closest call of the lot; `ذَرَّةً` was the alternative).
- `عَلٰى` in v6 was **copied** from `QASIDAS[3]` for the dagger. 36 of the
  words already existed in the corpus byte-identical; none clash on mark order.

**The refrain repeats after the owner's #2, #4 and #6** (`repeatRefrain`),
which the reader shows as cards **3, 5 and 7** — it counts the refrain as
card 1, the same offset as the Daybaʿī above. The `(2)` sits on the last
hemistich, `صَلُّوا عَلَيْهِ وَآلِهِ`, in all three columns. From v419 to v435
repeats stripped that closing count; **since v436 every repeat keeps it**
(#25, the user's call) and `stripRepeatCount` is gone.

**Audio: `Balaghal Ula Bi Kamalihi by Syrian Munshids with English
translation.mp4`, 273 s** (from the `mvhd` atom — this is an mp4, not an
MP3, so the Xing method above does not apply). It is the one recording with
a **video track** (H.264 + AAC; the subtitled video). The player is an
`<audio>` element, which plays the sound and ignores the picture, so it works
as-is — but a future upload should be audio-only like the Dalāʾil files. It
carries no artist tag, so reciter `syrian` is named from the file name.

---

## Known open items

**Raised during the سيدنا collation.** Three of these were first written down
wrong; the corrected reading is what stands here. **Re-measure a flag before
acting on it** — all three errors were in the summary, not in the audit files
under `findings/`, which were right.

- ~~Tuesday is missing two `‖` page breaks~~ — **not so**: measured in v440,
  Tuesday renders 14 leaves in both apps and both versions, as the corpus
  table records.
- ~~Tuesday v134 — the app has a clause the book does not~~ — **removed in
  v440 / v101**, owner's call, once the Mughlay printing showed it lacks
  `وَعَلٰى آلِ إِبْرَاهِيمَ` too. Gone from both versions (the Mughlay's
  `وَعَلٰى آلِ سَيِّدِنَا إِبْرَاهِيمَ`), `tr` and `en` in step. (That is index
  133; this list counted from 1.)
- ~~Monday P1 v43 tatweel~~ — **it was Wednesday v43, and it is fixed** (v389).
  `أَنْبِيَـاءِ` now matches v44's spelling byte-for-byte. Three tatweels remain
  and are all correct: `هـ` in the Title Page (the AH abbreviation) and
  `وَمَلَـٰٓئِكَتَهۥ` / `يـٰٓأَيُّهَا` in Monday P1 v18, which are Uthmani Qurʾānic forms.
  **Do not strip those.**
- ~~Sunday v19's `en`~~ — **not a fault.** The "O our Master" there renders
  `يَا مَوْلَانَا`, which is in the Arabic and out of scope by the ruling.
- On four days the app disagrees with its own source text in one to three
  places, on words unrelated to `سيدنا`.

- **Bookmarks, three related fixes** (`resumeDalail`, `placeIsHere`, `msVerseEl`
  — v392, then v393). All confirmed by driving the app in a headless browser,
  not read off the code and assumed.

  **v392** — resuming a bookmark scrolled to the right leaf but the gold
  highlight never appeared. `markPlacedMsVerse()` unconditionally clears every
  `.placed` element before re-marking one; `resumeDalail()`'s call passed only
  `(idx, verse)`, so the key it computed was always `null` and the clear was
  never followed by a re-mark. Fixed by passing `p.seg, p.mk` through.

  **v393** — the owner caught a second, related fault: the "Save my place"
  chip kept reading "Place saved" after paging away from the bookmark, so
  there was no way to tell where it actually was, or whether a bare tap on a
  new page would do anything (tapping a phrase first still worked — a fresh
  candidate bypasses the stale-looking button — but a bare tap on a new page
  with nothing newly highlighted was, and is meant to remain, a no-op).
  `placeIsHere()` only ever compared the saved place's *chapter*, never the
  *leaf* — so "Place saved" stayed lit across every page of the chapter, and
  the anti-clobber guard in `saveDalailPlace` (which reuses `placeIsHere`)
  read the whole chapter as "already here" too, which is what made a bare tap
  elsewhere in the chapter a no-op instead of moving the place. Made
  `placeIsHere` leaf-aware, and hooked `refreshPlaceBtn()` into `msSyncDots()`
  so the label updates live on a swipe, not only on a tap.

  That fix immediately failed for one test case — verse.split across a page
  turn — which traced to a real bug one level deeper: `msVerseEl()`, used by
  both `placeIsHere` and `resumeDalail`, locates a split verse's chunk by
  matching the mark-key *prefix* (`d:6:33.`), which can't tell chunk `.0` from
  `.1` and always returns whichever is first in the DOM — the earlier page,
  even when the bookmark is on the later one. Fixed by passing the bookmark's
  own `mk` through so `msVerseEl` can find the exact chunk when it has that
  information, falling back to the old prefix search when it doesn't (older
  saved places with no `mk`).

  This turned out to be the same fault behind a note from v392 that was left
  as unresolved: resuming a bookmark on the second half of a split verse
  landed the highlighted phrase off-screen, and it wasn't clear whether that
  was real or a headless-environment artifact. It was real, and it's the same
  wrong-chunk bug — `resumeDalail`'s scroll-nudge was measuring the wrong
  page's geometry. Confirmed fixed by the same `mk`-aware `msVerseEl`: the
  phrase now lands on screen.

  Verified: an unsplit verse, a verse split across a page turn, tapping a new
  phrase on a different page and having the label follow it, paging back to
  the vacated page and having the label correctly turn off, and a bare
  re-tap with nothing newly highlighted leaving the saved verse/seg/mk
  unchanged (only its timestamp moves).

  A second, unrelated finding from the same read-through: `msReflowOverflow()`
  was defined but never called anywhere. **Removed in v398**, after checking it
  was not protecting anything: it was an anti-clipping safety net that moved
  overflowing text onto a fresh leaf, and `msAutoFit`'s shrink loop now does
  that job — measured zero overflowing leaves across every Dalāʾil, litany and
  Barzanji chapter, in both views, at three viewports. Note that the
  `msSyncDots()` call which sat at the end of that function went with it; it
  looked like the one that runs after a render, but it was inside dead code.
  `msSyncDots` is reachable from the `#ms-book` `onscroll` handler, from
  `resumeDalail`, and from `scrollToVerse` — **not** from a plain open.

  **v445 / v103 — the phrase, not the verse** (owner's report: a bookmark
  did not bring them back to the words they had highlighted, and switching
  to Study did not land on the verse holding them). Measured first, in a
  headless browser over four days, both versions: Book → Study landed on the
  wrong verse 38 times in 78, and a resume left the phrase off-screen 8
  times. Two causes:

  - `resumeDalail` scrolled to the top of the phrase's whole **verse**
    (`vEl`). A long verse fills most of a leaf, so the phrase sat below the
    screen. It now scrolls to the `.seg` carrying `p.mk`, and raises it if
    it is in the lowest quarter of the screen, where the fixed leaf arrows sit.
    The flash is on the phrase, and only on the last of the two passes.
  - `setPageView` always took the **top verse of the leaf**
    (`topVisibleMsVerse`). It now asks `bookSpotForSwitch()`: the phrase the
    reader last highlighted (`msPlaceCandidate`), else the `.placed`
    bookmark, if either is on the current leaf; else the top verse. The
    phrase travels as **its text plus its position** in the verse, and
    `studySegFor` finds the Study phrase containing that text. Matching by
    text is required because the two views number phrases differently:
    the Book count restarts on each page a verse spans, and a `‖` inside a
    phrase splits it in Book but not in Study. `scrollToVerse`'s Study
    branch takes that object as `seg` and keeps the verse number in view
    unless the phrase is further down than 60% of a screen.

  After, both versions: Mawalid 114/114 (Monday P1, Wednesday, Friday,
  Saturday) and the fork 36/36 (Tuesday, Sunday), for both the switch —
  the highlighted words on screen, flashed — and the resume — the right
  leaf, the phrase on screen and placed. Test in `scratchpad/bm/bm.js`. A Mughlay phrase taller
  than the screen — no commas, so one phrase can be a whole long verse —
  starts at the top, which is the most that can be shown. Study → Book
  still lands on the leaf where the top verse begins (unchanged, not
  reported).
- ~~`leaderPending` and its panel branch are unreachable~~ — **removed in v398**.
  Nothing ever set the flag true and there was no dynamic access, so every read
  was constant-false: the "Looking for the leader…" panel branch could not
  render, and the `alive` handler's `(leaderless || leaderPending)` reduced to
  `leaderless`. `clearLeaderPending()` itself is **live** — it is reached down
  the leaderless path — so only the flag went; the function keeps its now
  slightly misleading name rather than take a rename through this subsystem for
  cosmetic gain.
- **Transliteration and English** for al-Ḥizb al-Aʿẓam and Ḥizb al-Istighfār —
  Arabic-only by the owner's call (752 of `LITANY_CHAPTERS`' 950 verses). The
  renderer handles per-verse `tr`/`en`, so this can be layered in later with no
  restructuring. **The ilāhīs (70) have `en` but no `tr`** at all — not yet
  raised with the owner. **The Diyāʾ's `tr` was written in v425** on the
  owner's request, all 120 verses, in the mawlid qasidas' style (`QASIDAS[5]`):
  ` · ` for each `۞`, the article as `-l-`/`-r-`, `-Llāh`, pausal endings as
  vowelled, the second hemistich lower-case. Lines the app already carried
  (the Opening Ṣalawāt's first hemistich, the Standing's `Ṣallā-Llāhu` and
  `Marḥaban` lines) reuse the existing wording. The Qurʾānic verses carry `tr`
  like the Opening Duʿāʾ's — `en` there was already the owner's source text.
  The build asserted one ` · ` per rosette in every verse. **Both apps
  (v425 / v95)** — the fork carries the Diyāʾ in its mawlids list, byte-identical
  to Mawalid's, like the Barzanji, so a Diyāʾ change goes into both.
- **The Title Page's three `tr` were filled** in v389. The five Qurʾānic `en` in
  the Opening Duʿāʾ were filled in the same release and **reverted in v390** —
  see non-negotiable 3. Those five are the only Dalāʾil verses without an `en`,
  and they stay that way.
- ~~The Barzanji is a 17-chapter shell with 2 verses~~ — **filled in v394** from
  the owner's own pasted source (Arabic, transliteration and English for all
  123 verses), on the owner's ruling to *"use the source's structure"*. The
  17 invented chapters are gone; it is now the source's 19, and no chapter
  renders the placeholder any more.

  **All three questions this raised are now settled by the owner:**

  - **The six chapter titles render their English headings** — `[5]` الْمَوْلُودُ الشَّرِيفُ,
    `[9]` وَفَاةُ أُمِّهِ الشَّرِيفَةِ, `[11]` رَفْعُ الْحَجَرِ الْأَسْوَدِ, `[13]` أَوَّلُ مَنْ آمَنَ,
    `[16]` أُمُّ مَعْبَدٍ وَأَبُو مَعْبَدٍ, `[18]` الْأَخْلَاقُ الشَّرِيفَةُ — on the owner's
    instruction to *"just translate the english titles"*. The source has
    English chapter titles only, and the PDF has no Arabic text layer and no
    headings at all, so there was nothing authoritative to read off. The other
    13 are the old shell's titles verbatim. Every one of the six is assembled
    **by script** from tokens extracted out of the corpus, with at most a final
    case vowel changed — because hand-typing them once produced `الْبِعْةَةُ` for
    `الْبِعْثَةُ` (a tāʾ marbūṭa for a thāʾ) and silently dropped the article-lām
    sukūn from all thirteen reused titles. Only `الْمَوْلُودُ` is a genuinely new
    word. Two traps worth keeping: an extracted token must be **NFC-normalised
    before use** — older app text is shadda-first, and one such token would have
    made a title differ in bytes from the same word everywhere else in the
    array — and the last short vowel is **not always the last character**, since
    NFC puts a trailing shadda after it (`أُمِّ` ends `0650 0651`).
  - **Verses 80, 83, 85 and 123 embed Qurʾānic quotations, and the source's
    English for them is kept** — the owner's call: *"if the source content has
    the translations, keep them"*. This is not the v389 breach: that was English
    rendered **in-house** for wholly-Qurʾānic verses, where `en` still stays
    empty. These are mixed verses carrying the owner's own source translation.
    Non-negotiable 3 governs in-house rendering, not a translation the owner
    supplies.
  - **Chapter 1's English is the source's**, matching the other 122 verses, on
    the owner's instruction. The older, more literary wording it used to carry
    (*"I commence [this] composition in the Name of the Supreme Being…"*) is
    gone; it could not have been split across the source's three verses anyway.

  Method worth keeping: the normalisation set was **derived, not guessed**.
  Source chapter 1 is a passage the app already carried, so it doubles as a
  test — `normalised(source ch1)` must come out byte-identical to the app's
  existing bytes, and does, across all 104 words. That one assertion validated
  the extraction and all four rules at once (NFC mark order, the lafẓ
  al-jalāla dagger, `عَلَى`→`عَلٰى`, `أِ`→`إِ`). Do the same for any future
  import that overlaps existing text.

  Verse 123 closes on Qurʾān 37:180–182, which the app already carried in its
  own imlāʾī style; **those bytes were reused** rather than the source's
  Uthmani forms, which would otherwise have been the corpus's only alif wasla.
  The Qiyam is a per-verse `note` on verse 19 — the renderer supports
  `v.note`, which is worth remembering; it is not only a chapter-level field.
- **The article-lām sukūn sweep is larger than it looks**: 81 occurrences across
  76 distinct words carry an article lām before a moon letter with no sukūn
  (`وَالخَاتِمِ`, `وَالمَلَائِكَةِ`, `بِالحَقِّ`). The old note said "three `وَالحَمْدُ`";
  `وَالحَمْدُ` is only 4 of them. Check the printing before sweeping.
- **`LITANY_CHAPTERS[2]`/`[3]`** stay as title slots; do not fill them with verses.
- **`QAWWALI_CHAPTERS` (33 songs, 326 verses) filled in v396**, ported wholesale
  from the Sacred Lyrics app's `qawwalis` array in `App.jsx`
  (github.com/abdulmajid1993/qasida). No Arabic-script bytes are involved —
  every song is transliteration (`ar`) plus English (`en`), so it's shaped
  like `ILAHI_CHAPTERS` (`latin:true`), not like the Arabic collections, and
  none of the Arabic-anchor cautions above apply to it. Structure kept:
  - Each song's `chorus` becomes its first verse, flagged `refrain:true` —
    the source app renders it once, above the verses, and never repeats it,
    but a qawwali's chorus is understood to be the line the ensemble returns
    to, so the flag (and its existing "Refrain" label/styling) fits.
  - The source's `introCount` (which verses get labelled "Intro" instead of
    "Verse N") was **not** carried over — Mawalid numbers every verse
    sequentially regardless of kind everywhere else (Ilahi's own refrain
    included), and inventing a new "Intro" tag just for this section would
    have broken that consistency for no material gain. The verses themselves,
    and their order, are unchanged.
  - `titleEnglish` is `"<title> — <poet>"`, not a translated gloss (none
    exists, and none should be invented) — it exists so `favKey()`/
    `favItems()`, which look a bookmarked piece up **by titleEnglish**, get a
    unique key per song. All 33 titles happen to already be unique, but a
    bare `titleEnglish:""` on every entry would have made every bookmarked
    qawwali resolve to whichever one happens to be first in the array. The
    " — poet" suffix reuses the exact split `readerHTML` already does for a
    `latin:true` chapter, so the reader shows the poet as a byline rather
    than a duplicated title. A `poet` field also sits on each chapter,
    unused by `readerHTML`, read only by `qawwaliCards()` for the card list's
    second line.
  - The upstream `qasida` repo remains the source for any future qawwali —
    keep this array in step with its `qawwalis` array rather than editing
    either independently.

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
