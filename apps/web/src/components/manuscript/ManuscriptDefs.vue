<template>
  <!-- Das gekachelte Muster des illuminierten Kopfbandes. Einmal je
       Buchansicht definiert und über url(#msGul) benutzt.

       Es MUSS innerhalb des .theme-manuscript-Blocks stehen: die fill-Werte
       lesen die semantischen Tokens, und außerhalb löste --surface-card auf
       die Kartenfläche der Seite auf statt auf das Blattpapier. -->
  <svg width="0" height="0" aria-hidden="true" focusable="false" class="defs">
    <defs>
      <pattern id="msGul" width="44" height="40" patternUnits="userSpaceOnUse">
        <rect width="44" height="40" fill="var(--ornament-band-a)" />
        <path d="M0,20 H44" stroke="var(--accent)" stroke-width="1" />
        <path
          v-for="a in [0, 45, 90, 135, 180, 225, 270, 315]"
          :key="a"
          d="M22,7.5C25.4,13.25 25.4,16 22,20C18.6,16 18.6,13.25 22,7.5Z"
          :transform="`rotate(${a} 22 20)`"
          fill="var(--ornament-band-b)"
          stroke="var(--accent)"
          stroke-width=".7"
        />
        <circle
          cx="22"
          cy="20"
          r="3"
          fill="var(--surface-card)"
          stroke="var(--accent)"
          stroke-width=".8"
        />
        <circle cx="0" cy="20" r="2.2" fill="var(--accent)" />
        <circle cx="44" cy="20" r="2.2" fill="var(--accent)" />
      </pattern>
    </defs>
  </svg>
</template>

<style scoped>
.defs {
  position: absolute;
}
</style>
