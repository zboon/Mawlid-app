import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

/* Die URL bildet die Hierarchie ab. Das ist mehr als Kosmetik: die alte App
   hatte keinen Router — der Zurück-Knopf des Browsers verließ die App, und
   keine Ansicht ließ sich teilen.

   Modul und Sammlung stehen beide im Pfad, obwohl die API ein Werk auch am
   Kürzel allein findet. Zwei Gründe: der Pfad bleibt lesbar, und die API kann
   damit ein doppeltes Kürzel auflösen, statt mit 409 zu antworten. */
const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  {
    path: '/m/:module',
    name: 'module',
    component: () => import('@/views/ModuleView.vue'),
  },
  {
    path: '/m/:module/:collection',
    name: 'collection',
    component: () => import('@/views/CollectionView.vue'),
  },
  {
    path: '/m/:module/:collection/:work',
    name: 'work',
    component: () => import('@/views/WorkView.vue'),
  },
  {
    path: '/mehr',
    name: 'more',
    component: () => import('@/views/MoreView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  /* Beim Öffnen eines Werkes immer oben anfangen; beim Zurückgehen dorthin,
     wo man war. */
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
})
