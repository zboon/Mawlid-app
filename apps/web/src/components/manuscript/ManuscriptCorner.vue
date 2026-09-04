<template>
  <!-- Die Eckvignette des Schlussblattes. -->
  <svg class="corner" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <path
      d="M8,8 H64 M8,8 V64"
      fill="none"
      stroke="var(--accent)"
      stroke-width="2"
      stroke-linecap="round"
    />
    <path
      d="M15,15 H48 M15,15 V48"
      fill="none"
      stroke="var(--surface-border)"
      stroke-width="1"
      stroke-linecap="round"
    />
    <path
      v-for="a in [0, 45, 90, 135, 180, 225, 270, 315]"
      :key="a"
      d="M30,9C36.2,18.66 36.2,23.28 30,30C23.8,23.28 23.8,18.66 30,9Z"
      :transform="`rotate(${a} 30 30)`"
      fill="var(--ornament-band-b)"
      stroke="var(--accent)"
      stroke-width="1"
    />
    <circle
      cx="30"
      cy="30"
      r="5.4"
      fill="var(--surface-card)"
      stroke="var(--accent)"
      stroke-width="1.1"
    />
    <circle cx="30" cy="30" r="2.2" fill="var(--ornament-rosette)" />
  </svg>
</template>

<style scoped>
.corner {
  width: 2.6rem;
  height: 2.6rem;
}
</style>
