<script setup lang="ts">
/* Das Lesezeichen der Vorlage: Umriss solange nichts gemerkt ist, gefüllt
   danach. Als SVG mit currentColor, damit es das Gold des Bereichs nimmt
   statt der festen Farbe eines Emojis. */
defineProps<{ on?: boolean }>()
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    width="19"
    height="19"
    aria-hidden="true"
    :fill="on ? 'currentColor' : 'none'"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="M6.5 3.5h11a.9.9 0 0 1 .9.9v15.8a.5.5 0 0 1-.77.42L12 16.8l-5.63 3.82a.5.5 0 0 1-.77-.42V4.4a.9.9 0 0 1 .9-.9z"
    />
  </svg>
</template>
