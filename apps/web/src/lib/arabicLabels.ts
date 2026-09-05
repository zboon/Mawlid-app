/* Arabische Beschriftungen der Index-Möbel — INHALT, keine Oberflächentexte.
 *
 * Sie stehen deshalb nicht in i18n/: die Oberflächensprache wechselt zwischen
 * Deutsch und Englisch, diese Zeilen bleiben immer arabisch daneben stehen,
 * wortgleich mit der Vorlage. Auf Dauer gehören sie in die Datenbank
 * (module_translations/collection_translations, lang='ar'); bis dahin ist
 * diese Datei die eine Stelle, an der sie liegen. */

export const AR = {
  before: 'قَبْلَ الْقِرَاءَةِ',
  dailyDalail: 'الْأَحْزَابُ الْيَوْمِيَّةُ',
  dailyAwrad: 'الْأَوْرَادُ الْيَوْمِيَّةُ',
  completion: 'عِنْدَ الْخَتْمِ',
  chooseMawlid: 'اختر مولداً',
  chooseSection: 'اختر قسماً',
  chooseChapter: 'اختر فصلاً',
  chooseLitany: 'اختر حزباً',
  choosePortion: 'اختر حزباً',
  downloads: 'التَّسْجِيلَاتُ الْمَحْفُوظَةُ',
  favorites: 'الْمُفَضَّلَة',
} as const

/* Eine Zahl in arabisch-indischen Ziffern — toArNum() der Vorlage. */
export const toArabicDigits = (n: number): string =>
  String(n)
    .split('')
    .map((d) => AR_DIGITS[Number(d)] ?? d)
    .join('')

/* Die Wochentage, wie die Bubbles sie tragen — 0 = Sonntag wie Date.getDay(). */
export const AR_WEEKDAYS: Record<number, string> = {
  0: 'الأَحَد',
  1: 'الِاثْنَيْن',
  2: 'الثُّلَاثَاء',
  3: 'الأَرْبِعَاء',
  4: 'الْخَمِيس',
  5: 'الْجُمُعَة',
  6: 'السَّبْت',
}

/* Arabisch-indische Ziffern für das „Mon ²" der Bubbles. */
export const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const
