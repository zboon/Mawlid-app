import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'

import './styles/tokens.css'
import './styles/fonts-latin.css'
import './styles/base.css'

createApp(App).use(createPinia()).use(i18n).use(VueQueryPlugin).use(router).mount('#app')
