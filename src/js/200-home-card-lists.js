function diyaCards(){
  const items = DIYA_CHAPTERS.map((c,n)=>({c,n})).filter(x=>matchesQuery(x.c, state.query));
  if(items.length === 0) return '';
  return items.map(({c,n})=>`
        <button class="qcard" onclick="openDiya(${n})">
          <span class="num">${toArNum(n+1)}</span>
          <span class="titles">
            <span class="t-ar">${c.titleArabic}</span>
            <span class="t-en">${c.titleEnglish}</span>
          </span>
          <span class="chev">›</span>
        </button>` + hitList('y', n)).join('');
}

/* One Dalāʾil chapter as an index card. Shared by the flat search list and the
   grouped browse index below, so both stay in step. */
function dalailCard(n){
  const c = DALAIL_CHAPTERS[n];
  return `
        <button class="qcard" onclick="openDalail(${n})">
          <span class="num">${toArNum(n+1)}</span>
          <span class="titles">
            <span class="t-en lead">${c.titleEnglish}</span>
            <span class="t-ar">${c.titleArabic}</span>
          </span>
          <span class="chev">›</span>
        </button>`;
}

/* SEARCH uses this — a flat, query-filtered list. The browse index uses
   dalailIndex() instead. Keep this filtered and flat. */
function dalailCards(){
  const items = DALAIL_CHAPTERS.map((c,n)=>({c,n})).filter(x=>x.n !== 0 && matchesQuery(x.c, state.query));
  if(items.length === 0) return '';
  return items.map(({n})=>dalailCard(n) + hitList('d', n)).join('');
}

/* The daily portion for today — Monday opens Part 1; the second Monday portion
   (Mon²) is reached from the strip. JS getDay(): 0=Sun … 6=Sat. */
const DALAIL_WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DALAIL_TODAY_IDX = { 1:6, 2:7, 3:8, 4:9, 5:10, 6:11, 0:12 };
function dalailTodayIdx(){ return DALAIL_TODAY_IDX[new Date().getDay()]; }

/* The week strip and the three collapsible groups. */
const DALAIL_DAYS = [
  {idx:6,  en:'Mon',        ar:'الِاثْنَيْن'},
  {idx:7,  en:'Tue',        ar:'الثُّلَاثَاء'},
  {idx:8,  en:'Wed',        ar:'الأَرْبِعَاء'},
  {idx:9,  en:'Thu',        ar:'الْخَمِيس'},
  {idx:10, en:'Fri',        ar:'الْجُمُعَة'},
  {idx:11, en:'Sat',        ar:'السَّبْت'},
  {idx:12, en:'Sun',        ar:'الأَحَد'},
  {idx:13, en:'Mon \u00B2', ar:'الِاثْنَيْن ٢'},
];
const DALAIL_ROWS = {
  before: {en:'Before the reading', ar:'قَبْلَ الْقِرَاءَةِ'},
  daily:  {en:'The daily portions', ar:'الْأَحْزَابُ الْيَوْمِيَّةُ'},
  done:   {en:'On completion',      ar:'عِنْدَ الْخَتْمِ'},
};
/* The Dalāʾil browse index — Option E: a today card, the resume ribbon, a week
   strip, then the parts in three collapsible groups. NOT used for search. */
function dalailIndex(){
  const today = dalailTodayIdx();
  const t = DALAIL_CHAPTERS[today];
  const todayCard = `<button class="dk-today" onclick="openDalail(${today})">
      <span class="dk-today-k">Today · ${DALAIL_WEEKDAYS[new Date().getDay()]}</span>
      <span class="dk-today-ar">${t.titleArabic}</span>
      <span class="dk-today-go">Open this portion ›</span></button>`;
  const rowlab = r => `<div class="dk-rowlab"><span class="l-en">${r.en}</span><span class="l-ar">${r.ar}</span></div>`;
  // The daily portions grid comes first — four to a line, Mon² last; today highlighted.
  const days = DALAIL_DAYS.map(d =>
    `<button class="dk-bubble${d.idx === today ? ' on' : ''}" onclick="openDalail(${d.idx})"><span class="b-en">${d.en}</span><span class="b-ar">${d.ar}</span></button>`).join('');
  // Secondary entries below a divider — one shared row style.
  const navRow = (action, en, ar) => `<button class="dk-nav" onclick="${action}"><span class="dk-nav-txt"><span class="b-en">${en}</span><span class="b-ar">${ar}</span></span><span class="dk-nav-go">›</span></button>`;
  const before = navRow("selectTab('before')", DALAIL_ROWS.before.en, DALAIL_ROWS.before.ar);
  const rows =
      navRow("openDalail(14)",        DALAIL_ROWS.done.en,   DALAIL_ROWS.done.ar)
    + navRow("selectTab('downloads')", 'Downloaded recitations', 'التَّسْجِيلَاتُ الْمَحْفُوظَةُ')
    + navRow("openDalail(0)",         'About Dalāʾil al-Khayrāt', 'دَلَائِلُ الْخَيْرَاتِ');
  return `<div class="edition-row"><span class="edition-k">Version</span>${editionSwitch()}</div>` + todayCard + resumeCard()
    + before
    + rowlab(DALAIL_ROWS.daily) + `<div class="dk-grid4">${days}</div>`
    + `<div class="dk-sep"></div>`
    + rows;
}

