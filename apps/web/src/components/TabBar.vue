<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { Tab } from './TabBar.types'

/* Die Modulleiste — in der Vorlage die Tabs „Mawlid Collections · Nasheeds &
   Qasidas · Dalāʾil al-Khayrāt". Sie zeigt die BEREICHE der App und bleibt
   stehen, solange man in einem von ihnen ist; die Sammlungen darunter wählt
   man auf der Seite des Bereichs, nicht hier. */
const props = defineProps<{ tabs: Tab[]; active: string }>()
defineEmits<{ select: [slug: string] }>()

const bar = ref<HTMLElement | null>(null)

/* Nach jedem Rendern wird der aktive Tab in die Mitte gescrollt. Ohne das
   steht der gewählte Tab womöglich außerhalb des Bildes. */
watch(
  () => [props.active, props.tabs.length],
  async () => {
    await nextTick()
    const el = bar.value?.querySelector<HTMLElement>('.tab.active')
    if (!el || !bar.value) return
    const target = el.offsetLeft - (bar.value.clientWidth - el.clientWidth) / 2
    bar.value.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  },
  { immediate: true },
)
</script>

<template>
  <nav ref="bar" class="tabbar" aria-label="Bereiche">
    <button
      v-for="tab in tabs"
      :key="tab.slug"
      class="tab"
      :class="{ active: tab.slug === active }"
      type="button"
      :aria-current="tab.slug === active ? 'page' : undefined"
      @click="$emit('select', tab.slug)"
    >
      <span class="t-latin">{{ tab.latin }}</span>
      <span v-if="tab.arabic" class="t-ar" lang="ar" dir="rtl">{{ tab.arabic }}</span>
    </button>
  </nav>
</template>

<style scoped>
.tabbar {
  display: flex;
  justify-content: flex-start;
  gap: var(--space-sm);
  overflow-x: auto;
  padding: var(--space-lg) var(--space-xl);
  background: var(--brand-deep);
  scrollbar-width: none;
}

.tabbar::-webkit-scrollbar {
  display: none;
}

/* Der Zentrier-Trick: automatische Ränder zentrieren die Leiste, solange sie
   passt, und fallen bei Überlauf auf null zusammen. Dadurch bleibt der erste
   Tab immer scrollbar erreichbar — ein justify-content:center würde ihn
   unerreichbar machen. */
.tabbar > :first-child {
  margin-inline-start: auto;
}

.tabbar > :last-child {
  margin-inline-end: auto;
}

.tab {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3xs);
  min-width: 5.2rem;
  padding: var(--space-sm) var(--space-lg);
  border: 1.5px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--brand-on);
  background: var(--on-brand-fill-subtle);
  transition:
    background var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease);
}

.tab.active {
  background: var(--accent);
  border-color: var(--accent-soft);
  color: var(--brand-deep);
}

.t-latin {
  font-size: var(--text-sm);
  font-weight: 700;
  line-height: 1.15;
  white-space: nowrap;
}

.t-ar {
  font-family: var(--font-arabic);
  font-size: var(--text-base);
  line-height: 1.2;
  letter-spacing: var(--tracking-none);
  opacity: 0.85;
  white-space: nowrap;
}

.tab.active .t-ar {
  opacity: 1;
}

.tab:not(.active):active {
  background: var(--on-brand-fill-active);
}
</style>
