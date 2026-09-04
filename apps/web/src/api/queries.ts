/* TanStack Query — die Abfragen der Inhalts-Zone an einer Stelle.
 *
 * Inhalte ändern sich selten. `staleTime` steht deshalb hoch: der HTTP-Cache
 * mit seinen ETags erledigt die Frischeprüfung eine Ebene tiefer, und ein
 * zweiter Zähler daneben hieße nur, dass die Anzeige zweimal blinkt.
 */

import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type {
  CollectionDetail,
  ModuleDetail,
  ModuleList,
  ScheduleToday,
  WorkDetail,
} from '@mawalid/shared'
import { apiGet } from './client'

const FIVE_MINUTES = 5 * 60 * 1000
const HALF_HOUR = 30 * 60 * 1000

const shared = {
  staleTime: FIVE_MINUTES,
  gcTime: HALF_HOUR,
  /* Ein 404 wird nicht besser, wenn man ihn dreimal stellt. Wiederholt wird
     nur, was ein Netzfehler sein kann. */
  retry: (count: number, error: unknown) => {
    const status = (error as { status?: number }).status ?? 0
    if (status >= 400 && status < 500) return false
    return count < 2
  },
}

const q = (value: string | undefined, key: string) =>
  value ? `&${key}=${encodeURIComponent(value)}` : ''

export function useModules() {
  return useQuery({
    ...shared,
    queryKey: ['modules'],
    queryFn: ({ signal }) => apiGet<ModuleList>('/modules', signal),
  })
}

export function useModule(slug: MaybeRefOrGetter<string>) {
  return useQuery({
    ...shared,
    enabled: computed(() => toValue(slug).length > 0),
    queryKey: computed(() => ['module', toValue(slug)]),
    queryFn: ({ signal }) =>
      apiGet<ModuleDetail>(`/modules/${encodeURIComponent(toValue(slug))}`, signal),
  })
}

export function useCollection(
  slug: MaybeRefOrGetter<string>,
  moduleSlug: MaybeRefOrGetter<string | undefined>,
) {
  return useQuery({
    ...shared,
    /* Solange das Kürzel leer ist — zwischen `/m/dalail` und der Umleitung auf
       die erste Sammlung —, wird nicht gefragt. Sonst geht eine Anfrage auf
       `/collections/` hinaus, die zu Recht mit 400 beantwortet wird und in
       der Entwicklerkonsole aussieht wie ein Fehler. */
    enabled: computed(() => toValue(slug).length > 0),
    queryKey: computed(() => ['collection', toValue(slug), toValue(moduleSlug)]),
    queryFn: ({ signal }) =>
      apiGet<CollectionDetail>(
        `/collections/${encodeURIComponent(toValue(slug))}?${q(toValue(moduleSlug), 'module').slice(1)}`,
        signal,
      ),
  })
}

export function useWork(
  slug: MaybeRefOrGetter<string>,
  collectionSlug: MaybeRefOrGetter<string | undefined>,
  lang: MaybeRefOrGetter<string>,
) {
  return useQuery({
    ...shared,
    enabled: computed(() => toValue(slug).length > 0),
    queryKey: computed(() => ['work', toValue(slug), toValue(collectionSlug), toValue(lang)]),
    queryFn: ({ signal }) =>
      apiGet<WorkDetail>(
        `/works/${encodeURIComponent(toValue(slug))}?lang=${toValue(lang)}` +
          q(toValue(collectionSlug), 'collection'),
        signal,
      ),
  })
}

/* `enabled` kommt von außen: ob eine Sammlung überhaupt einen Wochenplan hat,
   steht erst in ihrer Antwort. Ohne diese Bedingung fragte die Oberfläche für
   jede Sammlung nach „heute" und bekäme für die meisten einen 404 — richtig
   beantwortet, aber trotzdem eine Anfrage, die niemand stellen wollte. */
export function useScheduleToday(
  collectionSlug: MaybeRefOrGetter<string>,
  moduleSlug: MaybeRefOrGetter<string | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  /* Der Wochentag kommt aus dem Browser, nicht vom Server: sonst entschiede
     dessen Zeitzone, welcher Teil am Freitagabend gilt. */
  const weekday = new Date().getDay()
  return useQuery({
    ...shared,
    enabled: computed(() => toValue(enabled) && toValue(collectionSlug).length > 0),
    queryKey: computed(() => ['schedule', toValue(collectionSlug), toValue(moduleSlug), weekday]),
    queryFn: ({ signal }) =>
      apiGet<ScheduleToday>(
        `/schedule/${encodeURIComponent(toValue(collectionSlug))}/today?weekday=${weekday}` +
          q(toValue(moduleSlug), 'module'),
        signal,
      ),
  })
}
