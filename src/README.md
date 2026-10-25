# src/ — the source of the app

`index.html` and `sw.js` in the repo root are **generated** from this folder. Edit
the files here, then run:

    node build.js            # rebuild index.html and sw.js
    node build.js --check    # exit 1 if the committed ones are out of date

Never edit `index.html` or `sw.js` by hand — the next build overwrites them. GitHub
Pages still serves one self-contained page (offline-first, nothing extra to fetch);
only the way it is *edited* changed.

## How it fits together

- `index.template.html` — the page shell. `{{css}}` and `{{js}}` are replaced by the
  files below; `{{version}}` by `version.txt`; `{{inline:fonts/x.otf}}` by that file's base64.
- `version.txt` — **the one place the version lives.** It feeds the `<meta name="app-version">`,
  `APP_VERSION` in the script and the cache name in `sw.js`, so they can no longer drift.
- `css/` — style sheets, concatenated in filename order.
- `js/` — scripts, concatenated in filename order, **directories included** (a directory is
  a data array split into one file per chapter or piece). They are plain scripts sharing one
  global scope, so the **order matters** (e.g. a `const` must be defined before the code that
  reads it at load). To insert a file, give it a number between its neighbours.
- `fonts/`, `img/` — the embedded fonts and icons as real files.
- `sw.template.js` — the service worker.

### Data arrays

A directory such as `js/080-data-dalail/` is one array:

    000_head.js    const DALAIL_CHAPTERS = [
    001-….js …     one entry each (a fragment — an object followed by its comma)
    999_tail.js    ];

Edit an entry in its own file. Entry files are fragments, not standalone scripts, so an editor
may flag them; the built page is what is checked. `data-dalail-mughlay/` is the alternate map
split by chapter: each file holds that chapter's `"c:v":{…}` entries.

## Files

```
css/
  010-font-amiri-hafs.css   (30 lines)
  020-fonts-indopak-naskh-theme-base.css   (106 lines)
  030-header.css   (130 lines)
  040-nav-bar.css   (29 lines)
  050-index-list.css   (108 lines)
  060-reader.css   (27 lines)
  070-manuscript-leaf-and-open-book.css   (171 lines)
  080-ornaments-controls-refrain.css   (171 lines)
  090-dalail-index-and-reciter-bar.css   (108 lines)
  100-audio-dock-and-full-screen.css   (116 lines)
  110-full-screen-controls.css   (298 lines)
  120-place-ribbon-session-and-misc.css   (86 lines)
js/
  010-qasida-data-howto.js   (17 lines)
  020-data-qasidas/   (44 files)
  030-core-helpers.js   (74 lines)
  040-columns-and-saved-place.js   (127 lines)
  050-book-version-verse-bookmarking.js   (307 lines)
  060-favourites-and-search-index.js   (101 lines)
  070-verse-search.js   (162 lines)
  080-data-dalail/   (17 files)
  090-data-dalail-mughlay/   (13 files)
  100-dalail-version-switch.js   (152 lines)
  110-data-diya/   (10 files)
  120-data-barzanji/   (21 files)
  130-data-litany/   (20 files)
  140-collections-and-tabs.js   (52 lines)
  150-data-burdah/   (12 files)
  160-data-sirah/   (9 files)
  170-data-ilahi/   (13 files)
  180-data-qawwali/   (36 files)
  190-nav-bar-and-sections.js   (303 lines)
  200-home-card-lists.js   (87 lines)
  210-daily-azam.js   (46 lines)
  220-daily-istighfar.js   (130 lines)
  230-landing-page.js   (308 lines)
  240-auto-scroll-and-session-core.js   (373 lines)
  250-live-session-start-join.js   (98 lines)
  260-live-session-following.js   (277 lines)
  270-live-session-mic-and-liveness.js   (297 lines)
  280-qr-encoder.js   (72 lines)
  290-qr-bit-stream.js   (224 lines)
  300-live-session-qr-and-share.js   (380 lines)
  310-piece-openers.js   (245 lines)
  320-refrain-and-leaf-defs.js   (310 lines)
  330-float-and-audio-player.js   (85 lines)
  340-audio-catalogue.js   (118 lines)
  350-audio-storage.js   (54 lines)
  360-audio-downloads-screen.js   (116 lines)
  370-audio-dock.js   (238 lines)
  380-open-book-spread.js   (195 lines)
  390-rubric-english-and-inline-marks.js   (235 lines)
  400-history-and-restore.js   (169 lines)
fonts/
  font-amiri-2.woff
  font-amiri.woff
  font-dkindopak.woff2
  font-schnew.woff2
  font-uthmanichafs.otf
img/
  bismillah-mark.png
  favicon-32x32.png
  favicon-48x48.png
  header-bismillah.png
  logo-inner.png
```
