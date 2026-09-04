import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

/* Die URL bildet die Hierarchie ab. Das ist mehr als Kosmetik: die alte App
   hatte keinen Router — der Zurück-Knopf des Browsers verließ die App, und
   keine Ansicht ließ sich teilen. */
const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  {
    path: '/m/:module',
    name: 'module',
    component: () => import('@/views/ModuleView.vue'),
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
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
})
