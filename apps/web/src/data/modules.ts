/* Platzhalterdaten für Phase 1.
   Ab Phase 3 kommt genau diese Form aus GET /api/content/modules — die Felder
   sind schon so benannt wie die Spalten in db/schema.sql, damit der Wechsel
   von hier auf die API nur den Datenweg betrifft und keine Komponente. */

export type ViewType = 'recitation' | 'article' | 'wiki' | 'tree' | 'media' | 'link'

export interface Module {
  slug: string
  viewType: ViewType
  sortOrder: number
  isPublished: boolean
  title: { ar: string; de: string }
  /* Erscheint als .section-intro auf der Seite des Bereichs — NICHT auf der
     Startkachel. Die Startseite bleibt ruhig. */
  description: string
  /* Zählzeile der Kachel. Kommt später aus v_collection_counts. */
  count: string | null
}

export const MODULES: Module[] = [
  {
    slug: 'dalail',
    viewType: 'recitation',
    sortOrder: 10,
    isPublished: true,
    title: { ar: 'دَلَائِلُ الْخَيْرَاتِ', de: 'Dalāʾil al-Khayrāt' },
    description:
      'Das Segensbuch des Imām al-Jazūlī über den Propheten ﷺ, auf die Woche verteilt.',
    count: '15 Teile',
  },
  {
    slug: 'mawlid',
    viewType: 'recitation',
    sortOrder: 20,
    isPublished: true,
    title: { ar: 'مَجْمُوعَاتُ الْمَوَالِدِ', de: 'Mawlid' },
    description: 'Die Mawlid-Texte und die Qaṣīda Burda — eine Sammlung zum Rezitieren wählen.',
    count: '4 Sammlungen',
  },
  {
    slug: 'silsila',
    viewType: 'tree',
    sortOrder: 30,
    isPublished: true,
    title: { ar: 'السِّلْسِلَة', de: 'Silsila' },
    description: 'Die Kette der Überlieferung, Lehrer für Lehrer.',
    count: null,
  },
  {
    slug: 'sohbets',
    viewType: 'article',
    sortOrder: 40,
    isPublished: true,
    title: { ar: 'الصُّحْبَة', de: 'Sohbets' },
    description: 'Vorträge und Unterweisungen.',
    count: null,
  },
  {
    slug: 'ottoman',
    viewType: 'article',
    sortOrder: 50,
    isPublished: true,
    title: { ar: 'الْعُثْمَانِيَّة', de: 'Osmanisch' },
    description: 'Geschichte und Überlieferung.',
    count: null,
  },
  /* Noch nicht veröffentlicht — die Struktur steht, der Inhalt fehlt.
     Auf der Startseite bleibt ihr Rasterplatz einfach leer: ein leeres Feld
     ist ruhiger als eine graue "Demnächst"-Kachel. */
  {
    slug: 'ahzab',
    viewType: 'recitation',
    sortOrder: 60,
    isPublished: false,
    title: { ar: 'الْأَحْزَاب', de: 'Al-Aḥzāb' },
    description: 'Die täglichen Litaneien.',
    count: '4 Litaneien',
  },
  {
    slug: 'wiki',
    viewType: 'wiki',
    sortOrder: 70,
    isPublished: false,
    title: { ar: 'الْمَعْرِفَة', de: 'Wiki' },
    description: 'Nachschlagen und Querverweise.',
    count: null,
  },
]

export const publishedModules = () =>
  MODULES.filter((m) => m.isPublished).sort((a, b) => a.sortOrder - b.sortOrder)
