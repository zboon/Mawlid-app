function navBar(){
  return `<nav class="tabbar">${TABS.map(t=>`
    <button class="tab ${tabIsActive(t.id)?'active':''}" onclick="selectTab('${t.id}')">
      <span class="tab-en">${t.label}</span>
      <span class="tab-ar">${t.ar}</span>
    </button>`).join('')}</nav>`;
}

function selectTab(id){
  setImmersive(false);
  leftTheLeader();
  state.tab = id;
  state.query = '';
  state.burdahChapter = null;
  renderIndex();
  pushLoc();
}

/* Cards for a given group, honoring the search query. */
/* ── Mawlid ad-Daybaʿi: one ordered section ──────────────────────
   The mawlid's pieces live in two arrays: QASIDAS (its duas and qasidas)
   and SIRAH_CHAPTERS (its prose). Each carries its section number from the
   kitab in its title, e.g. "13b · …". We merge both and sort by that number
   so the tab follows the book's own order. A qasida with NO section number
   didn't come from the mawlid — it belongs under the Qasidas tab. */
const SECTION_RE = /^(\d+)(b?)\s*·\s*(.*)$/;

function sectionOf(title){
  const m = SECTION_RE.exec(title || '');
  if(!m) return null;
  return { num: +m[1] + (m[2] ? 0.5 : 0), label: m[1] + m[2], rest: m[3] };
}

function mawlidItems(){
  const items = [];
  QASIDAS.forEach((qa, i) => {
    const sec = sectionOf(qa.titleEnglish);
    if(sec) items.push({ sec, kind:'q', idx:i, piece:qa });
  });
  SIRAH_CHAPTERS.forEach((c, n) => {
    const sec = sectionOf(c.titleEnglish);
    if(sec) items.push({ sec, kind:'s', idx:n, piece:c });
  });
  items.sort((a,b) => a.sec.num - b.sec.num);
  /* Number them 1..N by their place in the kitab's order. The badge is a
     running position, not the kitab's own number, so the list never skips
     even though some of the kitab's sections aren't in the app yet. Adding a
     missing section later slots it in and renumbers everything automatically. */
  items.forEach((it, n) => { it.pos = n + 1; });
  return items;
}

function mawlidCards(){
  /* Position is assigned before filtering, so searching never renumbers. */
  const items = mawlidItems().filter(x => matchesQuery(x.piece, state.query));
  if(items.length === 0) return '';
  return items.map(({pos, kind, idx, piece}) => `
        <button class="qcard" onclick="${kind==='s' ? 'openSirah' : 'openQasida'}(${idx})">
          <span class="num">${toArNum(pos)}</span>
          <span class="titles">
            <span class="t-ar">${piece.titleArabic}</span>
            <span class="t-en">${sectionOf(piece.titleEnglish).rest}</span>
          </span>
          <span class="chev">›</span>
        </button>` + hitList(kind, idx)).join('');
}

/* Qasidas that did not come from the Mawlid ad-Daybaʿi */
/* Qasidas that did not come from the mawlid — the source of truth for both
   the Qasidas tab and the landing page's count. */
function additionalQasidaItems(){
  return QASIDAS.map((qa,i) => ({q:qa, i}))
    .filter(x => x.q.group === 'qasidas' && !x.q.retired && !sectionOf(x.q.titleEnglish));
}
/* The qasidas sung within the Mawlid ad-Daybaʿī, in the kitab's order (v456,
   owner's call). The Qasidas page lists them too, after the rest so the
   numbers people already use there do not move. They are the same entries,
   not copies, so a fix or a recording shows in both places. */
function daybaiQasidaItems(){
  return mawlidItems().filter(x => x.kind === 'q' && x.piece.group === 'qasidas')
    .map(x => ({q:x.piece, i:x.idx}));
}

/* Qasida al-Burdah isn't a QASIDAS entry — it's a synthetic card that opens
   the full, 10-chapter, fully-diacritized Burdah (BURDAH_CHAPTERS) as its own
   styled sub-list, so a chapter is one tap further in rather than duplicating
   any of its content back into this array. */
const QASIDA_BURDAH_ENTRY = { titleArabic: "قَصِيدَةُ الْبُرْدَة", titleEnglish: "Qasida al-Burdah · 10 chapters", verses: [] };

function additionalQasidaCards(){
  const items = additionalQasidaItems().filter(x => matchesQuery(x.q, state.query));
  const showBurdah = matchesQuery(QASIDA_BURDAH_ENTRY, state.query);
  if(items.length === 0 && !showBurdah) return '';
  let n = 0, out = '';
  if(showBurdah){
    n++;
    out += `
        <button class="qcard" onclick="selectTab('qasidas-burdah')">
          <span class="num">${toArNum(n)}</span>
          <span class="titles">
            <span class="t-ar">${QASIDA_BURDAH_ENTRY.titleArabic}</span>
            <span class="t-en">${QASIDA_BURDAH_ENTRY.titleEnglish}</span>
          </span>
          <span class="chev">›</span>
        </button>`;
  }
  const card = ({q:qa, i}) => {
    n++;
    const sec = sectionOf(qa.titleEnglish);
    return `
        <button class="qcard" onclick="openQasida(${i})">
          <span class="num">${toArNum(n)}</span>
          <span class="titles">
            <span class="t-ar">${qa.titleArabic}</span>
            <span class="t-en">${sec ? sec.rest : qa.titleEnglish}</span>
          </span>
          <span class="chev">›</span>
        </button>` + hitList('q', i);
  };
  out += items.map(card).join('');
  /* A search already shows these under the Mawlid ad-Daybaʿī heading. */
  if(!state.query){
    const daybai = daybaiQasidaItems();
    if(daybai.length) out += label('From the Mawlid ad-Daybaʿī · من الْمولد الدّيبعي', true) + daybai.map(card).join('');
  }
  return out;
}

function groupCards(group){
  const q = state.query;
  let items = QASIDAS.map((qa,i)=>({q:qa,i}))
    .filter(x=>x.q.group===group)
    .filter(x=>matchesQuery(x.q, q));
  if(q){
    const nq = normalize(q);
    const titleHit = (qa) => {
      const t = normalize(qa.titleEnglish + ' ' + qa.titleArabic);
      return (nq && t.includes(nq)) || (qa.titleEnglish + qa.titleArabic).toLowerCase().includes(q.toLowerCase().trim());
    };
    items.sort((a,b)=> (titleHit(b.q)?1:0) - (titleHit(a.q)?1:0));
  }
  if(items.length === 0) return '';
  return items.map(({q:qa,i},n)=>`
        <button class="qcard" onclick="openQasida(${i})">
          <span class="num">${toArNum(n+1)}</span>
          <span class="titles">
            <span class="t-ar">${qa.titleArabic}</span>
            <span class="t-en">${qa.titleEnglish}</span>
          </span>
          <span class="chev">›</span>
        </button>` + hitList('q', i)).join('');
}

function searchBox(atBottom){
  /* Resting placeholder is just "Search"; the fuller hint appears once you're
     actually typing, so the bar stays quiet on the page. */
  return `
      <div class="search-wrap${atBottom ? ' at-bottom' : ''}">
        <svg class="search-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"
             stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <circle cx="7" cy="7" r="4.4"/><line x1="10.4" y1="10.4" x2="14.2" y2="14.2"/>
        </svg>
        <input id="search" class="search" type="search" inputmode="search"
          placeholder="Search"
          onfocus="this.placeholder='e.g. ya nabi, salaam, mercy…'"
          onblur="this.placeholder='Search'"
          autocomplete="off" autocapitalize="off" autocorrect="off"
          value="${state.query.replace(/"/g,'&quot;')}"
          oninput="updateSearch(this.value)">
        ${state.query ? '<button class="search-clear" onclick="clearSearch()">✕</button>' : ''}
      </div>`;
}

function updateSearch(val){
  state.query = val;
  const results = document.getElementById('results');
  if(results) results.innerHTML = renderResults() + versionTag();
}

/* Placeholder shown for sections whose content isn't added yet. */
function placeholder(title){
  return `<div class="placeholder">
      <div class="ph-star">۞</div>
      <p><strong>${title}</strong></p>
      <p>No entries here yet. This section is ready — its contents can be added whenever you like.</p>
    </div>`;
}

function burdahCards(){
  const items = BURDAH_CHAPTERS.map((c,n)=>({c,n})).filter(x=>matchesQuery(x.c, state.query));
  if(items.length === 0) return '';
  return items.map(({c,n})=>`
        <button class="qcard" onclick="openBurdah(${n})">
          <span class="num">${toArNum(n+1)}</span>
          <span class="titles">
            <span class="t-ar">${c.titleArabic}</span>
            <span class="t-en">${c.titleEnglish}</span>
          </span>
          <span class="chev">›</span>
        </button>` + hitList('b', n)).join('');
}

function litanyCards(){
  /* Browsing, the seven daily portions of al-Ḥizb al-Aʿẓam are folded behind a
     single row that opens their own page. A search still lists them one by one,
     so no portion becomes unreachable from the search box. */
  const grouped = !state.query && (azamFilledDays().length || istighfarFilledDays().length);
  const items = LITANY_CHAPTERS.map((c,n)=>({c,n})).filter(x=>
    x.c.verses && x.c.verses.length
    && !(grouped && (isAzamDay(x.n) || isIstighfarDay(x.n)))
    && matchesQuery(x.c, state.query));
  let out = items.map(({c,n}, i)=>`
        <button class="qcard" onclick="openLitany(${n})">
          <span class="num">${toArNum(i+1)}</span>
          <span class="titles">
            <span class="t-ar">${c.titleArabic}</span>
            <span class="t-en">${c.titleEnglish}</span>
          </span>
          <span class="chev">›</span>
        </button>` + hitList('l', n)).join('');
  if(grouped && azamFilledDays().length){
    const n = azamFilledDays().length;
    out += `
        <button class="qcard" onclick="selectTab('azam')">
          <span class="num">${toArNum(items.length + 1)}</span>
          <span class="titles">
            <span class="t-ar">${collectionTitle(AZAM_TITLE_IDX).ar}</span>
            <span class="t-en">${collectionTitle(AZAM_TITLE_IDX).en} · ${n} daily ${n === 1 ? 'portion' : 'portions'}</span>
          </span>
          <span class="chev">›</span>
        </button>`;
  }
  if(grouped && istighfarFilledDays().length){
    const n = istighfarFilledDays().length;
    const shown = items.length + (azamFilledDays().length ? 1 : 0) + 1;
    out += `
        <button class="qcard" onclick="selectTab('istighfar')">
          <span class="num">${toArNum(shown)}</span>
          <span class="titles">
            <span class="t-ar">${collectionTitle(ISTIGHFAR_TITLE_IDX).ar}</span>
            <span class="t-en">${collectionTitle(ISTIGHFAR_TITLE_IDX).en} · ${n} daily ${n === 1 ? 'portion' : 'portions'}</span>
          </span>
          <span class="chev">›</span>
        </button>`;
  }
  return out;
}

function praisesHub(){
  return PRAISE_SECTIONS.map(c=>`
      <button class="home-card" onclick="selectTab('${c.id}')">
        <span class="hc-ar">${c.ar}</span>
        <span class="hc-en">${c.en}</span>
        <span class="hc-count">${countLabel(c.id, sectionCount(c.id))}</span>
      </button>`).join('');
}

function backToPraises(){
  return `<button class="back-link" onclick="selectTab('praises')">‹ Qasidas</button>`;
}

function backToQasidasList(){
  return `<button class="back-link" onclick="selectTab('qasidas')">‹ Qasidas</button>`;
}

function backToDalail(){
  return `<button class="back-link" onclick="selectTab('dalail')">‹ Dalāʾil al-Khayrāt</button>`;
}

function mawlidsHub(){
  return MAWLID_COLLECTIONS.map(c=>`
      <button class="home-card" onclick="selectTab('${c.id}')">
        <span class="hc-ar">${c.ar}</span>
        <span class="hc-en">${c.en}</span>
        <span class="hc-count">${countLabel(c.id, sectionCount(c.id))}</span>
      </button>`).join('');
}

function backToMawlids(){
  return `<button class="back-link" onclick="selectTab('mawlids')">‹ Mawlid Collections</button>`;
}

/* The gathering's response is a practice, not part of the text, so it is
   stated once here rather than printed after every verse. */
function barzanjiResponseNote(){
  return `<div class="barz-note">${noteBlock("It is common practice for the gathering to respond with ṣallā Allāhu ʿalayh or Allāh after each verse the reciter reads.<span class=\"qnote-ar\">صَلَّى اللّٰهُ عَلَيْهِ · اللّٰه</span>")}</div>`;
}

function barzanjiCards(){
  const items = BARZANJI_CHAPTERS.map((c,n)=>({c,n})).filter(x=>matchesQuery(x.c, state.query));
  if(items.length === 0) return '';
  return items.map(({c,n})=>`
        <button class="qcard" onclick="openBarzanji(${n})">
          <span class="num">${toArNum(n+1)}</span>
          <span class="titles">
            <span class="t-ar">${c.titleArabic}</span>
            <span class="t-en">${c.titleEnglish}</span>
          </span>
          <span class="chev">›</span>
        </button>` + hitList('z', n)).join('');
}

