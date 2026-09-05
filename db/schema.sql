-- ============================================================================
--  Mawalid — MySQL 8 Schema
-- ----------------------------------------------------------------------------
--  Die Struktur ist aus der bestehenden App abgeleitet (111 Werke mit 2.512
--  Versen, verteilt auf neun JS-Arrays). Was dort in Array-Positionen und in Präfixen von
--  Titel-Zeichenketten steckte, ist hier zu Spalten geworden.
--
--  Erläuterungen zu jeder Entscheidung: docs/architecture/05-database.md
--
--  Ausführen:  mysql -u root -p mawalid < db/schema.sql   (nur Erstanlage —
--  bestehende Datenbanken zieht tools/load-seed.mjs nach, siehe UPGRADES dort;
--  eine neue Spalte gehört deshalb an BEIDE Stellen, wortgleich)
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
--  1 · Referenzdaten
-- ============================================================================

CREATE TABLE languages (
  code            VARCHAR(8)   NOT NULL,             -- BCP-47: 'ar', 'de', 'en', 'tr'
  name_native     VARCHAR(64)  NOT NULL,
  name_en         VARCHAR(64)  NOT NULL,
  direction       ENUM('ltr','rtl') NOT NULL DEFAULT 'ltr',
  default_script  ENUM('arab','latn') NOT NULL DEFAULT 'latn',
  is_ui_language  TINYINT(1)   NOT NULL DEFAULT 0,   -- steht im Sprachumschalter
  sort_order      SMALLINT     NOT NULL DEFAULT 0,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO languages (code, name_native, name_en, direction, default_script, is_ui_language, sort_order) VALUES
  ('ar', 'العربية',  'Arabic',  'rtl', 'arab', 1, 10),
  ('de', 'Deutsch',  'German',  'ltr', 'latn', 1, 20),
  ('en', 'English',  'English', 'ltr', 'latn', 1, 30),
  ('tr', 'Türkçe',   'Turkish', 'ltr', 'latn', 1, 40);


-- ============================================================================
--  2 · Struktur: Module → Sammlungen → Werke → Verse
-- ============================================================================

-- Ein Modul ist ein Bereich der App: Dalāʾil, Mawlid, Silsila, Sohbets,
-- Ottoman, Wiki, Info. Die Startseite rendert sich aus dieser Tabelle.
CREATE TABLE modules (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug          VARCHAR(64)  NOT NULL,
  -- Bestimmt, welche Vue-Ansicht die Inhalte darstellt. Eine kleine, feste
  -- Menge — ein neues Modul mit bekanntem Muster ist ein Datensatz, kein Code.
  view_type     ENUM('recitation','article','wiki','tree','media','link') NOT NULL,
  icon_key      VARCHAR(64)  NULL,
  -- Die Kachelfarbe des Bereichs aus der osmanischen Palette (Zayd-Entwurf):
  -- green, navy, maroon, teal, ochre, plum, rust, indigo, neutral. Sie färbt
  -- die Kachel UND das gesamte Chrom des Bereichs (Kopf, Tabs, Leseleiste).
  -- NULL = green, die Markenfarbe.
  theme_key     VARCHAR(24)  NULL,
  sort_order    SMALLINT     NOT NULL DEFAULT 0,     -- Platz im 3x3-Raster
  is_published  TINYINT(1)   NOT NULL DEFAULT 0,
  -- Veröffentlicht, aber nicht im Startmenü: Al-Aḥzāb wird über die Karte am
  -- Fuß des Dalāʾil-Index erreicht, nicht über eine eigene Kachel — so ist es
  -- im Zayd-Entwurf und in der Vorlage. Erreichbar bleibt der Bereich immer.
  in_menu       TINYINT(1)   NOT NULL DEFAULT 1,
  external_url  VARCHAR(512) NULL,                   -- nur für view_type='link'
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_modules_slug (slug),
  KEY ix_modules_order (is_published, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE module_translations (
  module_id     INT UNSIGNED NOT NULL,
  lang          VARCHAR(8)   NOT NULL,
  title         VARCHAR(255) NOT NULL,
  subtitle      VARCHAR(255) NULL,
  description   TEXT         NULL,                   -- erscheint als .section-intro
  PRIMARY KEY (module_id, lang),
  CONSTRAINT fk_modtr_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
  CONSTRAINT fk_modtr_lang   FOREIGN KEY (lang)      REFERENCES languages(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Eine Sammlung ist eine Gruppe innerhalb eines Moduls: "Mawlid ad-Daybaʿī",
-- "Qasida Burdah", "Al-Ḥizb al-Aʿẓam". parent_id erlaubt Zwischenebenen
-- (Modul "Nasheeds & Qasidas" → Sammlung "Ilahis" → Werke), was heute die
-- Konstante TAB_CHILDREN von Hand nachbildet.
CREATE TABLE collections (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  module_id       INT UNSIGNED NOT NULL,
  parent_id       INT UNSIGNED NULL,
  slug            VARCHAR(96)  NOT NULL,
  sort_order      SMALLINT     NOT NULL DEFAULT 0,
  is_published    TINYINT(1)   NOT NULL DEFAULT 0,
  -- Monoton steigend bei jeder inhaltlichen Änderung an dieser Sammlung oder
  -- an irgendetwas darunter. Der Client fragt "hat sich seit N etwas geändert?"
  -- Das ist die Vorbereitung für einen späteren Offline-Cache (ADR-004).
  content_version BIGINT UNSIGNED NOT NULL DEFAULT 1,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_collections_slug (module_id, slug),
  KEY ix_collections_parent (parent_id, sort_order),
  KEY ix_collections_module (module_id, is_published, sort_order),
  CONSTRAINT fk_coll_module FOREIGN KEY (module_id) REFERENCES modules(id)     ON DELETE CASCADE,
  CONSTRAINT fk_coll_parent FOREIGN KEY (parent_id) REFERENCES collections(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE collection_translations (
  collection_id INT UNSIGNED NOT NULL,
  lang          VARCHAR(8)   NOT NULL,
  title         VARCHAR(255) NOT NULL,
  subtitle      VARCHAR(255) NULL,
  description   TEXT         NULL,
  PRIMARY KEY (collection_id, lang),
  CONSTRAINT fk_colltr_coll FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  CONSTRAINT fk_colltr_lang FOREIGN KEY (lang)          REFERENCES languages(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Ein Werk ist ein lesbares Stück: eine Qasida, ein Ḥizb, ein Kapitel der
-- Burdah, ein Wochenteil der Dalāʾil.
CREATE TABLE works (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  collection_id   INT UNSIGNED NOT NULL,
  slug            VARCHAR(160) NOT NULL,
  sort_order      SMALLINT     NOT NULL DEFAULT 0,

  -- Die Kartusche über dem Manuskript-Kopfband (heute: piece.cartouche).
  cartouche       VARCHAR(255) NULL,

  -- In welcher Schrift der Originaltext steht. Ersetzt das Flag `latin: true`,
  -- mit dem türkische Ilahis heute im Feld `ar` untergebracht werden.
  primary_script  ENUM('arab','latn') NOT NULL DEFAULT 'arab',
  primary_lang    VARCHAR(8)   NOT NULL DEFAULT 'ar',

  -- Ob die Manuskriptansicht angeboten wird (Werk hat Folio-Angaben).
  has_folios      TINYINT(1)   NOT NULL DEFAULT 0,

  -- Veröffentlicht, aber von der Suche ausgenommen. Genau ein Fall in der
  -- Vorlage: die Titelseite der Dalāʾil (Kapitel 0) — Vorspann, keine Lesung;
  -- dort taucht sie weder in der Suche noch in der Kapitelliste auf.
  in_search       TINYINT(1)   NOT NULL DEFAULT 1,

  status          ENUM('draft','review','published') NOT NULL DEFAULT 'draft',
  published_at    TIMESTAMP    NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_works_slug (collection_id, slug),
  KEY ix_works_collection (collection_id, status, sort_order),
  CONSTRAINT fk_works_coll FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  CONSTRAINT fk_works_lang FOREIGN KEY (primary_lang)  REFERENCES languages(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE work_translations (
  work_id   INT UNSIGNED NOT NULL,
  lang      VARCHAR(8)   NOT NULL,
  title     VARCHAR(500) NOT NULL,
  -- Der grüne Hinweisbanner oben im Leser (heute: piece.note).
  note      TEXT         NULL,

  -- Der Titel in derselben Normalisierung wie verse_texts.body_search.
  -- Ohne diese Spalte findet die Suche ein Werk nicht, dessen Titel den
  -- Begriff trägt, dessen Verse aber nicht — bei "Burdah" oder "Qasida"
  -- genau der Regelfall. Die alte App nimmt die Titel in denselben
  -- Heuhaufen wie die Verse; das muss so bleiben.
  title_search VARCHAR(500) NULL,

  PRIMARY KEY (work_id, lang),
  KEY ix_worktr_search (title_search(191)),
  CONSTRAINT fk_worktr_work FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
  CONSTRAINT fk_worktr_lang FOREIGN KEY (lang)    REFERENCES languages(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Ein Vers ist eine Zeile des Werkes. Er trägt selbst KEINEN Text — der steht
-- in verse_texts, einmal je Sprache und Rolle. Hier stehen nur die Eigenschaften,
-- die die Darstellung bestimmen.
CREATE TABLE verses (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_id      INT UNSIGNED    NOT NULL,
  position     SMALLINT UNSIGNED NOT NULL,   -- 0-basiert, wie im Quellarray

  -- Was für eine Zeile das ist. Aus den Flags der alten Daten abgeleitet:
  --   verse       gewöhnlicher Vers
  --   refrain     Kehrvers (Flag `refrain`)  → goldener Rand, Label "Refrain"
  --   instruction Rubrik aus dem Buch (Flag `instruction`) → Gold, kursiv,
  --               Umschrift ausgeblendet
  --   basmala     die Basmala-Zeile, mit Goldlinie darunter
  verse_kind   ENUM('verse','refrain','instruction','basmala') NOT NULL DEFAULT 'verse',

  -- Eine Überschrift über diesem Vers, arabisch (Flag `band`), z. B.
  -- "ابْتِدَاءُ الثُّلُثِ الثَّانِي" — Beginn des zweiten Drittels. Erzeugt im
  -- Manuskript ein Teilerband, in der Lese-Ansicht eine Zwischenüberschrift.
  band_label   VARCHAR(255) NULL,

  -- Eine kleine Beschriftung über dem Vers (Flag `note`), z. B. "Sūrat al-Ikhlāṣ".
  note_label   VARCHAR(255) NULL,

  -- Ein Trennzeichen, das hinter dem Vers steht (Flag `sep`), z. B. "ﷺ".
  -- NICHT `separator` nennen: das ist in MySQL ein reserviertes Wort
  -- (GROUP_CONCAT ... SEPARATOR) und bricht die CREATE TABLE ohne Backticks.
  separator_mark VARCHAR(16) NULL,

  -- Keine Rosetten in diesem Vers rendern (Flag `noRosette`).
  no_rosette   TINYINT(1)   NOT NULL DEFAULT 0,

  -- Dieses Blatt lässt das gedruckte Buch selbst teilweise leer (Flag
  -- `shortPage`). Die Höhenanpassung der Manuskriptansicht schließt solche
  -- Blätter aus der Perzentilberechnung aus.
  short_page   TINYINT(1)   NOT NULL DEFAULT 0,

  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_verses_position (work_id, position),
  CONSTRAINT fk_verses_work FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Der eigentliche Text. Eine Zeile je (Vers, Sprache, Rolle).
--
-- Das löst zwei Probleme der alten Struktur auf einmal:
--   1. Die drei festen Felder ar/tr/en können nicht um Deutsch erweitert werden.
--   2. Türkische Ilahis mussten ihren lateinischen Originaltext ins Feld `ar`
--      legen und mit `latin: true` markieren.
CREATE TABLE verse_texts (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  verse_id    BIGINT UNSIGNED NOT NULL,
  lang        VARCHAR(8)   NOT NULL,
  -- original        = der Quelltext (arabisch, oder türkisch bei Ilahis)
  -- transliteration = Umschrift des Originals in lateinischer Schrift
  -- translation     = Übersetzung
  role        ENUM('original','transliteration','translation') NOT NULL,
  script      ENUM('arab','latn') NOT NULL,

  -- Der Text, wie er gesetzt wird. Enthält die Auszeichnungen der Quelle:
  --   ۞      Halbverstrenner (Rosette)
  --   \n     harter Zeilenumbruch innerhalb des Verses
  --   ‖      weicher Trenner, wird bei der Anzeige entfernt
  body        TEXT NOT NULL,

  -- Dieselbe Zeichenkette, normalisiert für die Suche: Diakritika entfernt,
  -- Alef-/Hamza-/Ya-Formen vereinheitlicht, Tatwil entfernt, Umschrift auf
  -- ASCII gefaltet. Wird von der Anwendung berechnet, nicht von MySQL — die
  -- Regeln müssen exakt denen der alten App entsprechen, damit die Suche sich
  -- nicht anders verhält. Siehe docs/architecture/05-database.md §6.
  body_search TEXT NULL,

  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_versetexts (verse_id, lang, role),
  KEY ix_versetexts_lang (lang, role),
  FULLTEXT KEY ft_versetexts_search (body_search),
  CONSTRAINT fk_vt_verse FOREIGN KEY (verse_id) REFERENCES verses(id)   ON DELETE CASCADE,
  CONSTRAINT fk_vt_lang  FOREIGN KEY (lang)     REFERENCES languages(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Ein Folio ist ein Blatt der Manuskriptansicht: ein Versbereich [von, bis].
-- Heute: piece.folios = [{from, to, sections?, band?}]
CREATE TABLE folios (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_id     INT UNSIGNED NOT NULL,
  position    SMALLINT UNSIGNED NOT NULL,       -- Blattnummer, 0-basiert
  verse_from  SMALLINT UNSIGNED NOT NULL,       -- einschließlich
  verse_to    SMALLINT UNSIGNED NOT NULL,       -- einschließlich
  -- Das Blatt enthält Abschnittsüberschriften (Flag `sections`).
  has_sections TINYINT(1)  NOT NULL DEFAULT 0,
  -- Ein Teilerband am Kopf dieses Blattes, arabisch beschriftet.
  band_label  VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_folios_position (work_id, position),
  CONSTRAINT fk_folios_work FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================================
--  3 · Lesereihenfolgen — was heute im Titelpräfix "13 · …" steckt
-- ============================================================================
--
--  Der Mawlid ad-Daybaʿī wird als eine durchgehende Folge gelesen, die aus
--  ZWEI Quellarrays verschränkt ist (QASIDAS und SIRAH_CHAPTERS). Die Ordnung
--  steht heute als Zahl im englischen Titel ("13 · Yā Nabī Salām ʿAlayka"),
--  ein angehängtes "b" bedeutet "+0,5" — also eine Einfügung zwischen zwei
--  Nummern des gedruckten Buches. Stücke ohne Zahl gehören nicht zum Mawlid.
--
--  Das ist Reihenfolge, die in einer Zeichenkette versteckt ist. Hier wird sie
--  eine Tabelle.

CREATE TABLE sequences (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  collection_id INT UNSIGNED NOT NULL,
  slug          VARCHAR(96)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sequences_slug (collection_id, slug),
  CONSTRAINT fk_seq_coll FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE sequence_items (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sequence_id  INT UNSIGNED NOT NULL,
  work_id      INT UNSIGNED NOT NULL,
  -- Die laufende Position in der Lesung: 1, 2, 3 … lückenlos. Das ist, was
  -- als Zahlmedaillon auf der Karte steht.
  ordinal      SMALLINT UNSIGNED NOT NULL,
  -- Die Nummer des gedruckten Buches ("13", "13b"). Nur zur Herkunftsangabe;
  -- die App zeigt sie nicht an, aber ohne sie ginge beim Einfügen eines
  -- fehlenden Abschnitts die Zuordnung zur Vorlage verloren.
  source_label VARCHAR(16) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_seqitems_ordinal (sequence_id, ordinal),
  UNIQUE KEY uq_seqitems_work (sequence_id, work_id),
  CONSTRAINT fk_seqit_seq  FOREIGN KEY (sequence_id) REFERENCES sequences(id) ON DELETE CASCADE,
  CONSTRAINT fk_seqit_work FOREIGN KEY (work_id)     REFERENCES works(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================================
--  4 · Wochenpläne — was heute DALAIL_TODAY_IDX & Co. sind
-- ============================================================================
--
--  Heute:  const DALAIL_TODAY_IDX = { 1:6, 2:7, 3:8, 4:9, 5:10, 6:11, 0:12 };
--  Das bildet Date.getDay() auf einen ARRAY-INDEX ab. Ein eingeschobenes
--  Kapitel verschiebt stillschweigend alles und die App zeigt am Dienstag den
--  Mittwochsteil. Drei solche Tabellen gibt es (Dalāʾil, Aʿẓam, Istighfār).

CREATE TABLE schedules (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  collection_id INT UNSIGNED NOT NULL,
  slug          VARCHAR(96)  NOT NULL,
  cycle         ENUM('weekly','monthly','yearly','none') NOT NULL DEFAULT 'weekly',
  PRIMARY KEY (id),
  UNIQUE KEY uq_schedules_slug (collection_id, slug),
  CONSTRAINT fk_sched_coll FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE schedule_slots (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  schedule_id INT UNSIGNED NOT NULL,
  -- 0 = Sonntag … 6 = Samstag, wie JavaScripts getDay(). Ein Wochentag darf
  -- mehrere Teile haben, daher slot_index. Der Montag der Dalāʾil hat zwei:
  -- Platz 0 ist der Zeiger der Vorlage (DALAIL_TODAY_IDX -> monday-part-1),
  -- Platz 1 ist „Montag, Teil 2" — in der Vorlage der achte Rasterplatz
  -- (DALAIL_DAYS: „Mon ²"). Die Heute-Karte nimmt Platz 0.
  weekday     TINYINT UNSIGNED NOT NULL,
  slot_index  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  work_id     INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_slots (schedule_id, weekday, slot_index),
  KEY ix_slots_work (work_id),
  CONSTRAINT fk_slot_sched FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  CONSTRAINT fk_slot_work  FOREIGN KEY (work_id)     REFERENCES works(id)     ON DELETE CASCADE,
  CONSTRAINT ck_slot_weekday CHECK (weekday BETWEEN 0 AND 6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================================
--  5 · Medien
-- ============================================================================

CREATE TABLE reciters (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(64)  NOT NULL,
  name_ar    VARCHAR(160) NULL,
  name_latin VARCHAR(160) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reciters_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Aufnahmen und Videos hängen am Werk, nicht an der Sammlung: von den acht
-- Dalāʾil-Aufnahmen ist Montag Teil 2 von einem anderen Rezitator. Eine Liste
-- statt eines Feldes, damit eine zweite Aufnahme desselben Teils ein Anhängen
-- ist und kein Umbau.
CREATE TABLE media (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_id       INT UNSIGNED NOT NULL,
  kind          ENUM('video','audio') NOT NULL,
  provider      ENUM('youtube','file','external') NOT NULL,
  url           VARCHAR(1024) NOT NULL,
  -- Ausschnitt innerhalb der Quelle (heute: videoStart / videoEnd).
  start_seconds INT UNSIGNED NULL,
  end_seconds   INT UNSIGNED NULL,
  -- Gemessene Länge. Dateigrößen werden bewusst NICHT gespeichert: die Kopien
  -- auf dem Server tragen ein zusätzliches Metadaten-Atom, jede hier notierte
  -- Zahl driftet. Die Größe wird beim Laden aus content-length gelesen.
  duration_seconds INT UNSIGNED NULL,
  reciter_id    INT UNSIGNED NULL,
  label         VARCHAR(160) NULL,                 -- z. B. "Alternative Version"
  sort_order    SMALLINT     NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY ix_media_work (work_id, kind, sort_order),
  CONSTRAINT fk_media_work    FOREIGN KEY (work_id)    REFERENCES works(id)    ON DELETE CASCADE,
  CONSTRAINT fk_media_reciter FOREIGN KEY (reciter_id) REFERENCES reciters(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Redaktionelle Auszeichnungen INNERHALB des Verstextes.
--
--  Heute: die Konstante INLINE_INSTRUCTIONS — eine Liste von Such-und-Ersetz-
--  Regeln, die beim Rendern bestimmte Stellen in eine goldene Glosse hüllen.
--  Das bildet nach, was das gedruckte Buch in farbiger Tinte setzt:
--    · Wiederholungszahlen        (3), (١٤), "(٤ مرات)"
--    · "(محل الْقيام)"            der Ort des Aufstehens
--    · "(فُلَانِ بْن فُلَانٍ)"      "so-und-so, Sohn von so-und-so" — hier den
--                                 eigenen Namen einsetzen. Trägt zusätzlich
--                                 eine englische Erklärung, die beim Antippen
--                                 als Blase erscheint.
--    · zwei editorische Einschübe aus al-Ḥizb al-Aʿẓam und Ḥizb al-Istighfār
--
--  Das ist echter redaktioneller Inhalt und keine Formatierung. Es geht
--  lautlos verloren, wenn man es übersieht — der Text erscheint weiterhin,
--  nur ohne die Auszeichnung. Deshalb eine eigene Tabelle statt einer
--  Konstante im Quelltext.
CREATE TABLE text_annotations (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  -- 'literal' = wörtliche Zeichenkette, 'regex' = regulärer Ausdruck.
  match_kind  ENUM('literal','regex') NOT NULL DEFAULT 'literal',
  pattern     VARCHAR(1000) NOT NULL,
  -- Wie die Fundstelle dargestellt wird. 'gloss' = goldene Tinte.
  style       ENUM('gloss') NOT NULL DEFAULT 'gloss',
  -- Auf welche Werke die Regel wirkt. NULL = auf alle.
  work_id     INT UNSIGNED NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order  SMALLINT     NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY ix_annot_work (work_id, is_active, sort_order),
  CONSTRAINT fk_annot_work FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Die Erklärung, die beim Antippen einer Glosse erscheint. Je Sprache eine.
CREATE TABLE text_annotation_translations (
  annotation_id INT UNSIGNED NOT NULL,
  lang          VARCHAR(8)   NOT NULL,
  gloss         TEXT         NOT NULL,
  PRIMARY KEY (annotation_id, lang),
  CONSTRAINT fk_anntr_ann  FOREIGN KEY (annotation_id) REFERENCES text_annotations(id) ON DELETE CASCADE,
  CONSTRAINT fk_anntr_lang FOREIGN KEY (lang)          REFERENCES languages(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================================
--  6 · Wiki und Informationsseiten
-- ============================================================================
--
--  Für die Module, die kein Rezitationstext sind: Silsila, Sohbets, Ottoman,
--  Wiki, Info. Struktur bewusst getrennt von works/verses — ein Artikel ist
--  Fließtext, kein nummerierter Vers.

CREATE TABLE articles (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  module_id    INT UNSIGNED NOT NULL,
  parent_id    INT UNSIGNED NULL,                  -- Baumstruktur für Wiki/Silsila
  slug         VARCHAR(160) NOT NULL,
  sort_order   SMALLINT     NOT NULL DEFAULT 0,
  status       ENUM('draft','review','published') NOT NULL DEFAULT 'draft',
  -- Für Silsila: Lebensdaten in einer Kette. NULL für alles andere.
  lifespan_from VARCHAR(32) NULL,                  -- "807 هـ / 1404 م"
  lifespan_to   VARCHAR(32) NULL,
  cover_url    VARCHAR(1024) NULL,
  published_at TIMESTAMP    NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_articles_slug (module_id, slug),
  KEY ix_articles_tree (parent_id, sort_order),
  KEY ix_articles_module (module_id, status, sort_order),
  CONSTRAINT fk_art_module FOREIGN KEY (module_id) REFERENCES modules(id)  ON DELETE CASCADE,
  CONSTRAINT fk_art_parent FOREIGN KEY (parent_id) REFERENCES articles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE article_translations (
  article_id  INT UNSIGNED NOT NULL,
  lang        VARCHAR(8)   NOT NULL,
  title       VARCHAR(500) NOT NULL,
  summary     TEXT         NULL,
  -- Markdown ist die Quelle; HTML wird beim Speichern erzeugt und
  -- gespeichert, damit die Auslieferung nicht bei jedem Aufruf rendert.
  body_md     MEDIUMTEXT   NULL,
  body_html   MEDIUMTEXT   NULL,
  body_search MEDIUMTEXT   NULL,
  PRIMARY KEY (article_id, lang),
  FULLTEXT KEY ft_articles_search (title, body_search),
  CONSTRAINT fk_arttr_art  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_arttr_lang FOREIGN KEY (lang)       REFERENCES languages(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Querverweise zwischen Artikeln — das, was ein Wiki zum Wiki macht.
CREATE TABLE article_links (
  from_article_id INT UNSIGNED NOT NULL,
  to_article_id   INT UNSIGNED NOT NULL,
  relation        VARCHAR(64) NOT NULL DEFAULT 'related',
  PRIMARY KEY (from_article_id, to_article_id, relation),
  CONSTRAINT fk_allink_from FOREIGN KEY (from_article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_allink_to   FOREIGN KEY (to_article_id)   REFERENCES articles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Verknüpfung zwischen Wiki und Rezitationstexten: ein Artikel über Imam
-- al-Būṣīrī zeigt auf die Burdah, und die Burdah zeigt zurück.
CREATE TABLE article_works (
  article_id INT UNSIGNED NOT NULL,
  work_id    INT UNSIGNED NOT NULL,
  relation   VARCHAR(64) NOT NULL DEFAULT 'about',
  PRIMARY KEY (article_id, work_id, relation),
  CONSTRAINT fk_aw_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_aw_work    FOREIGN KEY (work_id)    REFERENCES works(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================================
--  7 · Schlagworte
-- ============================================================================

CREATE TABLE tags (
  id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE tag_translations (
  tag_id INT UNSIGNED NOT NULL,
  lang   VARCHAR(8)   NOT NULL,
  label  VARCHAR(128) NOT NULL,
  PRIMARY KEY (tag_id, lang),
  CONSTRAINT fk_tagtr_tag  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  CONSTRAINT fk_tagtr_lang FOREIGN KEY (lang)   REFERENCES languages(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE taggables (
  tag_id      INT UNSIGNED NOT NULL,
  entity_type ENUM('work','article','collection') NOT NULL,
  entity_id   INT UNSIGNED NOT NULL,
  PRIMARY KEY (tag_id, entity_type, entity_id),
  KEY ix_taggables_entity (entity_type, entity_id),
  CONSTRAINT fk_taggables_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================================
--  8 · Benutzer, Rollen, Sitzungen
-- ============================================================================

CREATE TABLE users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,             -- argon2id
  display_name  VARCHAR(160) NOT NULL,
  role          ENUM('reader','contributor','editor','admin') NOT NULL DEFAULT 'reader',
  locale        VARCHAR(8)   NOT NULL DEFAULT 'de',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  last_login_at TIMESTAMP    NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  CONSTRAINT fk_users_locale FOREIGN KEY (locale) REFERENCES languages(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE auth_sessions (
  id         CHAR(36)     NOT NULL,                -- UUID
  user_id    INT UNSIGNED NOT NULL,
  token_hash CHAR(64)     NOT NULL,                -- SHA-256 des Cookie-Wertes
  expires_at TIMESTAMP    NOT NULL,
  user_agent VARCHAR(512) NULL,
  ip_hash    CHAR(64)     NULL,                    -- gehasht, nicht im Klartext
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_authsess_token (token_hash),
  KEY ix_authsess_user (user_id, expires_at),
  CONSTRAINT fk_authsess_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================================
--  9 · Persönliche Daten: Favoriten, Lesepositionen, Markierungen
-- ============================================================================
--
--  Diese Daten liegen heute im localStorage des Telefons. Sie gehören weiterhin
--  dorthin, solange niemand angemeldet ist — nur ein eingeloggter Mensch bekommt
--  sie serverseitig, damit sie das Gerät überdauern.
--
--  Deshalb die Spalte device_id: ein Gerät ohne Konto kann trotzdem
--  synchronisieren, wenn es das will, ohne sich zu registrieren.

CREATE TABLE devices (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id    CHAR(36)     NOT NULL,              -- vom Client erzeugt
  user_id      INT UNSIGNED NULL,
  label        VARCHAR(160) NULL,
  last_seen_at TIMESTAMP    NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_devices_public (public_id),
  KEY ix_devices_user (user_id),
  CONSTRAINT fk_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE favorites (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NULL,
  device_id  INT UNSIGNED NULL,
  work_id    INT UNSIGNED NOT NULL,
  sort_order SMALLINT     NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fav_user   (user_id, work_id),
  UNIQUE KEY uq_fav_device (device_id, work_id),
  CONSTRAINT fk_fav_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_fav_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_work   FOREIGN KEY (work_id)   REFERENCES works(id)   ON DELETE CASCADE,
  CONSTRAINT ck_fav_owner  CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- "Wo war ich?" — heute localStorage['mawlid-dalail-place'], EIN Eintrag für
-- die ganze App. Hier je Werk einer, was besser ist: man kann in den Dalāʾil
-- und in der Burdah gleichzeitig eine Stelle halten.
CREATE TABLE reading_positions (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NULL,
  device_id     INT UNSIGNED NULL,
  work_id       INT UNSIGNED NOT NULL,
  verse_id      BIGINT UNSIGNED NULL,
  -- Innerhalb eines Verses: der wievielte durch ۞ oder ، getrennte Abschnitt.
  segment_index SMALLINT UNSIGNED NULL,
  view_mode     ENUM('study','book') NOT NULL DEFAULT 'study',
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pos_user   (user_id, work_id),
  UNIQUE KEY uq_pos_device (device_id, work_id),
  CONSTRAINT fk_pos_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_pos_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_pos_work   FOREIGN KEY (work_id)   REFERENCES works(id)   ON DELETE CASCADE,
  CONSTRAINT fk_pos_verse  FOREIGN KEY (verse_id)  REFERENCES verses(id)  ON DELETE SET NULL,
  CONSTRAINT ck_pos_owner  CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Markierte Phrasen (heute localStorage['mawlid-marks'], Schlüssel der Form
-- "kind:idx:verse:segment" — vier in eine Zeichenkette gepresste Fremdschlüssel).
CREATE TABLE verse_marks (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NULL,
  device_id     INT UNSIGNED NULL,
  verse_id      BIGINT UNSIGNED NOT NULL,
  segment_index SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mark_user   (user_id, verse_id, segment_index),
  UNIQUE KEY uq_mark_device (device_id, verse_id, segment_index),
  CONSTRAINT fk_mark_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_mark_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_mark_verse  FOREIGN KEY (verse_id)  REFERENCES verses(id)  ON DELETE CASCADE,
  CONSTRAINT ck_mark_owner  CHECK (user_id IS NOT NULL OR device_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================================
-- 10 · Redaktion: Versionen, Protokoll, Korrekturmeldungen
-- ============================================================================

-- Vollständige Momentaufnahme vor jeder Änderung. Bei diesem Datenvolumen ist
-- das billig und rettet einen falsch angefassten arabischen Text.
CREATE TABLE content_revisions (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entity_type ENUM('work','verse','verse_text','article','collection','module') NOT NULL,
  entity_id   BIGINT UNSIGNED NOT NULL,
  revision    INT UNSIGNED    NOT NULL,
  payload     JSON            NOT NULL,            -- der Zustand VOR der Änderung
  author_id   INT UNSIGNED    NULL,
  note        VARCHAR(500)    NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rev (entity_type, entity_id, revision),
  KEY ix_rev_author (author_id, created_at),
  CONSTRAINT fk_rev_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE audit_log (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NULL,
  action      VARCHAR(64)  NOT NULL,               -- 'work.publish', 'user.role_change'
  entity_type VARCHAR(64)  NULL,
  entity_id   BIGINT UNSIGNED NULL,
  meta        JSON         NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_audit_time (created_at),
  KEY ix_audit_user (user_id, created_at),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Ersetzt den heutigen mailto:-Link "Spotted a correction?".
CREATE TABLE corrections (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  work_id       INT UNSIGNED    NULL,
  verse_id      BIGINT UNSIGNED NULL,
  reporter_name VARCHAR(160)    NULL,
  reporter_mail VARCHAR(255)    NULL,
  body          TEXT            NOT NULL,
  status        ENUM('new','accepted','rejected','applied') NOT NULL DEFAULT 'new',
  handled_by    INT UNSIGNED    NULL,
  handled_at    TIMESTAMP       NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_corr_status (status, created_at),
  CONSTRAINT fk_corr_work    FOREIGN KEY (work_id)    REFERENCES works(id)  ON DELETE SET NULL,
  CONSTRAINT fk_corr_verse   FOREIGN KEY (verse_id)   REFERENCES verses(id) ON DELETE SET NULL,
  CONSTRAINT fk_corr_handler FOREIGN KEY (handled_by) REFERENCES users(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================================
-- 11 · Live-Sitzungen
-- ============================================================================
--
--  Ersetzt die heutige Supabase-Realtime-Lösung. Der Zustand liegt in der
--  Datenbank, die Übertragung läuft über WebSockets (siehe ADR und
--  docs/architecture/08-live-sessions.md). Nur der aktuelle Zeiger wird
--  gespeichert — kein Verlauf, denn es gibt nichts nachzulesen.

CREATE TABLE live_sessions (
  id            CHAR(36)     NOT NULL,
  join_code     CHAR(4)      NOT NULL,             -- die vierstellige Zahl
  leader_device VARCHAR(64)  NOT NULL,
  work_id       INT UNSIGNED NULL,
  verse_id      BIGINT UNSIGNED NULL,
  view_mode     ENUM('study','book') NOT NULL DEFAULT 'study',

  -- 1 solange die Sitzung läuft, danach NULL. Der Umweg über NULL statt eines
  -- Booleans ist Absicht: MySQL lässt NULL in einem UNIQUE-Index beliebig oft
  -- zu, also gibt es je Code genau EINE aktive Sitzung, während beliebig viele
  -- beendete denselben Code behalten dürfen. Mit TINYINT(1) NOT NULL würden
  -- schon zwei beendete Sitzungen mit gleichem Code kollidieren.
  active_flag   TINYINT(1)   NULL DEFAULT 1,

  expires_at    TIMESTAMP    NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_live_code_active (join_code, active_flag),
  KEY ix_live_expiry (expires_at),
  CONSTRAINT fk_live_work  FOREIGN KEY (work_id)  REFERENCES works(id)  ON DELETE SET NULL,
  CONSTRAINT fk_live_verse FOREIGN KEY (verse_id) REFERENCES verses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================================
-- 12 · Hilfsansichten
-- ============================================================================

-- Das heutige Verhalten "welcher Teil ist heute dran?" als eine Abfrage.
-- Die Anwendung übergibt DAYOFWEEK(NOW())-1, damit die Zeitzone dort
-- entschieden wird und nicht im Datenbankserver.
CREATE OR REPLACE VIEW v_schedule_today AS
SELECT
  s.collection_id,
  s.slug         AS schedule_slug,
  sl.weekday,
  sl.slot_index,
  w.id           AS work_id,
  w.slug         AS work_slug
FROM schedules s
JOIN schedule_slots sl ON sl.schedule_id = s.id
JOIN works w           ON w.id = sl.work_id
WHERE s.cycle = 'weekly' AND w.status = 'published';

-- Wie viele Werke eine Sammlung hat -- für die Zählzeile auf der Startkachel.
CREATE OR REPLACE VIEW v_collection_counts AS
SELECT
  c.id                        AS collection_id,
  COUNT(DISTINCT w.id)        AS work_count,
  COUNT(v.id)                 AS verse_count
FROM collections c
LEFT JOIN works  w ON w.collection_id = c.id AND w.status = 'published'
LEFT JOIN verses v ON v.work_id = w.id
GROUP BY c.id;

-- Die Folio-Grenzen zeigen auf verses.position, NICHT auf verses.id — so wie
-- in der Vorlage. Diese Ansicht löst das auf, damit die API nicht jedes Mal
-- selbst rechnen muss.
CREATE OR REPLACE VIEW v_folio_verses AS
SELECT
  f.id       AS folio_id,
  f.work_id,
  f.position AS folio_position,
  v.id       AS verse_id,
  v.position AS verse_position
FROM folios f
JOIN verses v
  ON v.work_id = f.work_id
 AND v.position BETWEEN f.verse_from AND f.verse_to;
