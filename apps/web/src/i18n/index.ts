import { createI18n } from 'vue-i18n'
import de from './de.json'
import en from './en.json'

/* Zwei Dinge, die man nicht verwechseln darf: HIER stehen die
   Oberflächentexte. Die INHALTSübersetzungen liegen in der Datenbank und
   kommen über ?lang= an der API. Beide sind unabhängig — jemand kann die
   Oberfläche auf Deutsch haben und englische Übersetzungen lesen, was
   vorerst sogar der Normalfall ist. */
export const LOCALES = {
  de: { direction: 'ltr' },
  en: { direction: 'ltr' },
} as const

export type Locale = keyof typeof LOCALES

export const i18n = createI18n({
  legacy: false,
  locale: 'de',
  fallbackLocale: 'en',
  messages: { de, en },
})
