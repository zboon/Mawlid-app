/* Sufi devotional qawwalis — Urdu, Punjabi, Persian and Arabic, sung rather
   than recited, so the corpus carries only a transliteration (as "ar", the
   field readerHTML treats as the piece's own script for any latin:true
   chapter) and its English sense; there is no separate Arabic-script text
   to typeset. Brought over from the Sacred Lyrics app (github.com/abdulmajid1993/qasida),
   whose `qawwalis` array in App.jsx remains the source for future additions —
   this array should be kept in step with it rather than edited independently.
   Each song's chorus becomes its first verse, flagged refrain:true, since a
   qawwali's chorus is the line the ensemble returns to between verses.
   titleEnglish is "title — poet", exactly the "name — gloss" shape
   readerHTML already splits on for a latin chapter (see ILAHI_CHAPTERS) —
   here it supplies the reader's byline instead of a translated meaning
   (none exists), and its own necessary side effect: favKey()/favItems()
   look a favorited piece up BY titleEnglish, so it has to be unique per
   chapter, and every song's title already is. A bare titleEnglish:"" would
   have made every qawwali resolve to whichever one happens to be first. */
const QAWWALI_CHAPTERS = [
