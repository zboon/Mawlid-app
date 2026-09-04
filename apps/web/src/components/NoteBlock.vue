<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/* Der grüne Hinweis über einem Werk (heute: piece.note).
 *
 * Ein langer Hinweis ist zusammengeklappt — „Über diesen Abschnitt · نُبْذَة" —
 * damit niemand an einem Essay vorbeiscrollen muss, um zum Gebet zu kommen.
 * Ein kurzer bleibt offen: er kostet nichts. Die Schwelle (160 Zeichen) ist
 * die der Vorlage. */
const FOLD_AT = 160

const props = defineProps<{ text: string }>()
const { t } = useI18n()

const folded = computed(() => props.text.trim().length > FOLD_AT)
</script>

<template>
  <details v-if="folded" class="qnote folded">
    <summary>
      {{ t('reader.aboutSection') }} · <span lang="ar" dir="rtl">نُبْذَة</span>
      <span class="chev" aria-hidden="true">›</span>
    </summary>
    <div class="body">{{ text }}</div>
  </details>
  <div v-else class="qnote">{{ text }}</div>
</template>

<style scoped>
.qnote {
  background: var(--brand);
  color: var(--brand-on);
  border-radius: var(--radius-md);
  padding: var(--space-lg) var(--space-xl);
  margin-bottom: var(--space-lg);
  font-size: var(--text-base);
  line-height: var(--leading-body);
  text-align: center;
}

.qnote.folded {
  padding: 0;
  overflow: hidden;
}

summary {
  list-style: none;
  cursor: pointer;
  padding: var(--space-md) var(--space-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  font-size: var(--text-md);
  letter-spacing: 0.02em;
}

summary::-webkit-details-marker {
  display: none;
}

summary::marker {
  content: '';
}

.chev {
  display: inline-block;
  color: var(--accent-soft);
  font-size: var(--text-lg);
  line-height: 1;
  transition: transform var(--duration-base) var(--ease);
}

.folded[open] summary .chev {
  transform: rotate(90deg);
}

.body {
  padding: var(--space-md) var(--space-xl) var(--space-lg);
  border-top: 1px solid var(--accent-line-soft);
}
</style>
