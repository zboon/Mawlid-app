# src/ — the source of the app

`index.html` and `sw.js` in the repo root are **generated** from this folder. Edit
the files here, then run:

    node build.js            # rebuild index.html and sw.js
    node build.js --check    # exit 1 if the committed ones are out of date

Never edit `index.html` or `sw.js` by hand — the next build overwrites them. GitHub
Pages still serves one self-contained page (offline-first, nothing extra to fetch);
only the way it is *edited* changed.

## How it fits together

Three source trees at the repo root and in `src/`, as in the SacredTexts app, joined by `build.js`:

- `content/` — **the texts**: `content/<section>/<piece>.json` plus an `index.json` per folder
  (see `content/README.md`).
- `fonts/`, `img/` — the embedded fonts and artwork as real files, inlined as base64 at build time.
- `src/` — the code:
  - `index.template.html` — the page shell. `{{css}}` and `{{js}}` are replaced by the files below;
    `{{version}}` by `version.txt`; `{{inline:fonts/x.otf}}` by that file's base64 (path from the repo root).
  - `version.txt` — **the one place the version lives.** It feeds the `<meta name="app-version">`,
    `APP_VERSION` and the cache name in `sw.js`, so they can no longer drift.
  - `css/`, `js/` — concatenated in filename order. They are plain scripts sharing one global
    scope, so **order is load order** (a `const` must be defined before code that reads it at
    load). To insert a file, give it a number between its neighbours.
  - `sw.template.js` — the service worker.

### Data

A data array's JS file holds only its leading comment and a placeholder, for example
`js/080-data-dalail.js`:

    const DALAIL_CHAPTERS = {{content:dalail}};

`{{content:section}}` becomes the JSON array of `content/section/*.json` in `index.json` order;
`{{content-map:section}}` merges the files' objects into one (the Mughlay alternates).

## Files

```
css/
  010-font-amiri-hafs.css   (29 lines)
  020-fonts-indopak-naskh-theme-base.css   (105 lines)
  030-header.css   (129 lines)
  040-nav-bar.css   (28 lines)
  050-index-list.css   (107 lines)
  060-reader.css   (26 lines)
  070-manuscript-leaf-and-open-book.css   (170 lines)
  080-ornaments-controls-refrain.css   (170 lines)
  090-dalail-index-and-reciter-bar.css   (107 lines)
  100-audio-dock-and-full-screen.css   (115 lines)
  110-full-screen-controls.css   (297 lines)
  120-place-ribbon-session-and-misc.css   (85 lines)
js/
  010-qasida-data-howto.js   (16 lines)
  020-data-qasidas.js   (34 lines)
  030-core-helpers.js   (73 lines)
  040-columns-and-saved-place.js   (126 lines)
  050-book-version-verse-bookmarking.js   (306 lines)
  060-favourites-and-search-index.js   (100 lines)
  070-verse-search.js   (161 lines)
  080-data-dalail.js   (4 lines)
  090-data-dalail-mughlay.js   (43 lines)
  100-dalail-version-switch.js   (151 lines)
  110-data-diya.js   (6 lines)
  120-data-barzanji.js   (1 lines)
  130-data-litany.js   (6 lines)
  140-collections-and-tabs.js   (51 lines)
  150-data-burdah.js   (3 lines)
  160-data-sirah.js   (1 lines)
  170-data-ilahi.js   (3 lines)
  180-data-qawwali.js   (17 lines)
  190-nav-bar-and-sections.js   (302 lines)
  200-home-card-lists.js   (86 lines)
  210-daily-azam.js   (45 lines)
  220-daily-istighfar.js   (129 lines)
  230-landing-page.js   (307 lines)
  240-auto-scroll-and-session-core.js   (372 lines)
  250-live-session-start-join.js   (97 lines)
  260-live-session-following.js   (276 lines)
  270-live-session-mic-and-liveness.js   (296 lines)
  280-qr-encoder.js   (71 lines)
  290-qr-bit-stream.js   (223 lines)
  300-live-session-qr-and-share.js   (379 lines)
  310-piece-openers.js   (244 lines)
  320-refrain-and-leaf-defs.js   (309 lines)
  330-float-and-audio-player.js   (84 lines)
  340-audio-catalogue.js   (117 lines)
  350-audio-storage.js   (53 lines)
  360-audio-downloads-screen.js   (115 lines)
  370-audio-dock.js   (237 lines)
  380-open-book-spread.js   (194 lines)
  390-rubric-english-and-inline-marks.js   (234 lines)
  400-history-and-restore.js   (168 lines)
```
