<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useSearch } from '@/stores/search'

/* Das Suchfeld der Vorlage: in Ruhe leise (durchscheinend, dünner Rand),
   beim Tippen voll da (Karte, Goldrand). Auf der Startseite fährt es als
   `at-bottom` ans untere Bildschirmende — fixed, nicht sticky: als letztes
   Kind des Index hätte sticky nur den eigenen Fußabstand als Laufweg. */

defineProps<{ atBottom?: boolean }>()

const { t } = useI18n()
const search = useSearch()
</script>

<template>
  <div class="search-wrap" :class="{ 'at-bottom': atBottom }">
    <svg
      class="search-icon"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
    >
      <circle cx="7" cy="7" r="4.4" />
      <line x1="10.4" y1="10.4" x2="14.2" y2="14.2" />
    </svg>
    <input
      v-model="search.query"
      class="search"
      type="search"
      inputmode="search"
      autocomplete="off"
      autocapitalize="off"
      autocorrect="off"
      :placeholder="t('search.placeholder')"
      :aria-label="t('search.placeholder')"
      @focus="($event.target as HTMLInputElement).placeholder = t('search.hint')"
      @blur="($event.target as HTMLInputElement).placeholder = t('search.placeholder')"
    />
    <button
      v-if="search.query"
      class="search-clear"
      type="button"
      :aria-label="t('search.clear')"
      @click="search.clear()"
    >
      ✕
    </button>
  </div>
</template>

<style scoped>
.search-wrap {
  position: relative;
  margin: var(--space-2xs) 0 var(--space-2xl);
}

.search {
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
  font-size: var(--text-base);
  color: var(--ink);
  background: transparent;
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-sm);
  padding: var(--space-md) var(--pad-search-inset);
  outline: none;
  opacity: 0.7;
  box-shadow: none;
  transition:
    opacity var(--duration-fast) var(--ease),
    background var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease),
    box-shadow var(--duration-fast) var(--ease);
}

.search:hover {
  opacity: 0.9;
}

.search:focus {
  opacity: 1;
  background: var(--surface-card);
  border-color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.search::placeholder {
  color: var(--ink-soft);
  opacity: 0.75;
}

/* Suchfelder bringen in WebKit ein eigenes ✕ mit — wir haben unseres. */
.search::-webkit-search-cancel-button {
  display: none;
}

.search-icon {
  position: absolute;
  left: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  width: 0.95rem;
  height: 0.95rem;
  color: var(--ink-soft);
  opacity: 0.5;
  pointer-events: none;
  transition:
    opacity var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.search-wrap:focus-within .search-icon {
  opacity: 1;
  color: var(--accent);
}

.search-clear {
  position: absolute;
  right: var(--space-sm);
  top: 50%;
  transform: translateY(-50%);
  width: 1.9rem;
  height: 1.9rem;
  border-radius: var(--radius-circle);
  border: none;
  background: none;
  color: var(--ink-soft);
  font-size: var(--text-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-clear:active {
  background: var(--surface-press);
}

.search-wrap.at-bottom {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(env(safe-area-inset-bottom, 0px) + 0.85rem);
  width: min(605px, calc(100% - 2.2rem));
  margin: 0;
  z-index: var(--z-nav);
}

/* Unten schwebend braucht es einen festen Grund — Inhalt läuft darunter. */
.search-wrap.at-bottom .search {
  opacity: 1;
  background: var(--surface-card);
  box-shadow: var(--shadow-md);
}

.search-wrap.at-bottom .search:focus {
  box-shadow: var(--shadow-lg);
}
</style>
