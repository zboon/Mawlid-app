<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { MediaItem } from '@mawalid/shared'
import IconButton from './IconButton.vue'

const props = defineProps<{ item: MediaItem | null }>()
const emit = defineEmits<{ close: [] }>()

const dock = ref<HTMLElement | null>(null)

/* Aus einer Zuschauer-Adresse wird eine Einbettungsadresse. `youtu.be/ID` und
   `watch?v=ID` kommen beide vor; alles andere wird nicht geraten, sondern als
   Verknüpfung angeboten. */
const youtubeId = (url: string): string | null => {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null
    if (u.hostname.endsWith('youtube.com')) return u.searchParams.get('v')
  } catch {
    /* Keine gültige Adresse — dann gibt es auch nichts einzubetten. */
  }
  return null
}

const embedUrl = computed(() => {
  const item = props.item
  if (!item || item.provider !== 'youtube') return null
  const id = youtubeId(item.url)
  if (!id) return null
  const params = new URLSearchParams({ autoplay: '1', rel: '0' })
  if (item.startSeconds !== null) params.set('start', String(item.startSeconds))
  if (item.endSeconds !== null) params.set('end', String(item.endSeconds))
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`
})

/* Das Dock steht fest am unteren Rand und würde sonst den letzten Vers
   verdecken. --player-h schiebt den Seitenfuß nach oben — dasselbe Token liest
   useManuscriptFit, um im Vollbild die Blatthöhe zu berechnen. */
watch(
  () => [props.item, dock.value] as const,
  () => {
    const height = props.item && dock.value ? dock.value.offsetHeight : 0
    document.documentElement.style.setProperty('--player-h', `${height}px`)
    document.body.classList.toggle('has-player', height > 0)
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  document.documentElement.style.setProperty('--player-h', '0px')
  document.body.classList.remove('has-player')
})
</script>

<template>
  <div v-if="item" ref="dock" class="dock">
    <div class="row">
      <span class="label">
        {{
          item.label ?? item.reciter?.nameLatin ?? (item.kind === 'audio' ? 'Aufnahme' : 'Video')
        }}
      </span>
      <IconButton label="Schließen" @click="emit('close')">✕</IconButton>
    </div>

    <iframe
      v-if="embedUrl"
      class="video"
      :src="embedUrl"
      title="Video"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen
    />

    <!-- Die Aufnahmen liegen als .mp4 vor und enthalten nur Ton. <audio> spielt
         sie, ohne ein schwarzes Rechteck aufzuspannen. -->
    <audio
      v-else-if="item.kind === 'audio'"
      class="audio"
      :src="item.url"
      controls
      autoplay
      preload="none"
    />

    <a v-else class="external" :href="item.url" target="_blank" rel="noopener noreferrer">
      {{ item.url }}
    </a>
  </div>
</template>

<style scoped>
.dock {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: var(--z-dock);
  background: var(--brand-deep);
  color: var(--brand-on);
  padding: var(--space-sm) var(--space-md) calc(env(safe-area-inset-bottom, 0px) + var(--space-sm));
  box-shadow: var(--shadow-up);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding-bottom: var(--space-xs);
}

.label {
  font-family: var(--font-serif);
  font-size: var(--text-md);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video {
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 40dvh;
  border: none;
  border-radius: var(--radius-sm);
  display: block;
}

.audio {
  width: 100%;
  display: block;
}

.external {
  color: var(--brand-on);
  font-size: var(--text-sm);
  word-break: break-all;
}
</style>
