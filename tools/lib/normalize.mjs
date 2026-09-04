/* ============================================================================
   Suchnormalisierung
   ----------------------------------------------------------------------------
   Diese Datei ist ab Phase 4 der gemeinsame Ursprung für Frontend, API und
   Import. Eine Funktion, drei Aufrufer, kein Auseinanderlaufen.

   normalizeArabic() ist Zeichen für Zeichen aus der alten index.html
   übernommen. Die Faltungsregeln sind über Jahre von Hand kalibriert worden —
   sie sind der Grund, warum „Muhammad", „Muhamad", „Mohammed" und „محمد" alle
   dasselbe finden. Wer hier etwas „aufräumt", verändert das Suchverhalten für
   Menschen, die einen Vers nur halb im Ohr haben.

   Ihre Regeln sind allerdings für ARABISCHE UMSCHRIFT gebaut. Auf deutschen
   Text angewandt richten sie Schaden an, vor allem w→u, y→i und das
   Zusammenziehen von Doppelbuchstaben:

       Wissen    → uisen        Woche     → uoche
       Wüste     → uste         Schwester → schuester
       weiß      → ueiß         Qualität  → kualitat

   Für Arabisch ist genau das erwünscht. Für deutsche Artikel- und Wiki-Texte
   ist es Unsinn. Deshalb ist die Normalisierung sprachabhängig — siehe
   docs/architecture/05-database.md §6.
   ========================================================================= */

/** Volle Faltung. Für arabischen Originaltext und dessen Umschrift. */
export function normalizeArabic(str) {
  if (!str) return '';
  let s = str.toLowerCase();

  // Kombinierende Zeichen entfernen (ā ṣ ḥ ʿ usw.)
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Arabische Harakat und Tatwil entfernen, Buchstabenvarianten
  // vereinheitlichen — damit die Suche funktioniert, ob jemand die
  // Vokalzeichen tippt oder nicht.
  s = s.replace(/[ً-ٰٟـ]/g, '');
  s = s
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه');

  // Umschriftzeichen und Satzzeichen zu Leerzeichen
  s = s.replace(/[ʿʾ'`’‘_\-.,;:!?()[\]"۞·‖]/g, ' ');

  // Lautfaltung für die üblichen Schreibvarianten. Die Reihenfolge ist
  // bedeutsam: q→k läuft vor kh→h, sonst würde „qh" anders fallen.
  s = s
    .replace(/ph/g, 'f')
    .replace(/ck/g, 'k')
    .replace(/q/g, 'k') // qasida = kasida
    .replace(/dh/g, 'd')
    .replace(/th/g, 't')
    .replace(/gh/g, 'g')
    .replace(/kh/g, 'h')
    .replace(/sh/g, 's')
    .replace(/ee/g, 'i') // nabee = nabi
    .replace(/ii/g, 'i')
    .replace(/ea/g, 'i')
    .replace(/oo/g, 'u') // rasool = rasul
    .replace(/ou/g, 'u')
    .replace(/uu/g, 'u')
    .replace(/aa/g, 'a') // salaam = salam
    .replace(/y/g, 'i') // naby = nabi
    .replace(/w/g, 'u');

  // Verbliebene Doppelbuchstaben zusammenziehen (rabbi = rabi)
  s = s.replace(/(.)\1+/g, '$1');

  return s.replace(/\s+/g, ' ').trim();
}

/* Zweite Stufe: zusätzlich ohne Leerzeichen, und DANACH nochmals
   Doppelbuchstaben zusammengezogen — das Entfernen eines Leerzeichens kann
   erst eine Doppelung erzeugen: „ar rahman" → „arrahman" → „arahman". */
export function tighten(normalized) {
  return String(normalized)
    .replace(/\s+/g, '')
    .replace(/(.)\1+/g, '$1');
}

/** Milde Variante für Deutsch, Englisch und Türkisch: Kleinschreibung,
    Diakritika, Satzzeichen. KEINE Lautfaltung. */
export function normalizeLatin(str, lang = 'de') {
  if (!str) return '';
  let s = str.toLowerCase();

  /* Umlaute vor dem NFD-Schritt auflösen: „Wüste" soll „wueste" ergeben und
     nicht „wste". Türkisch bleibt ausgenommen — dort ist ü ein eigener Laut
     und wird nicht zu ue. */
  if (lang === 'de') {
    s = s
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss');
  }
  if (lang === 'tr') {
    /* Das türkische punktlose ı fällt auf i, damit Suche und Text sich
       treffen, egal welche Tastatur benutzt wurde. */
    s = s.replace(/ı/g, 'i').replace(/İ/g, 'i');
  }

  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/[ʿʾ'`’‘_\-.,;:!?()[\]"۞·‖]/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

/** Wählt die passende Variante.

    Entscheidend ist die SPRACHE, nicht die Schrift. Die Umschrift eines
    arabischen Verses ist lateinisch geschrieben, aber Arabisch, und muss
    genauso falten wie das Original — sonst findet „Qasida" zwar das arabische
    Wort, aber nicht seine eigene Umschrift. */
export function normalizeFor(lang, str) {
  return lang === 'ar' ? normalizeArabic(str) : normalizeLatin(str, lang);
}
