<template>
  <!-- Die Rosette ۞ als Inline-SVG statt als Zeichen.
       Zwei Gründe: die Textschrift bildet U+06DE auf ein leeres
       Platzhalterglyph ab (es erschiene als schwarzer Klotz), und die
       Fassungen der alten App waren zwei Daten-URIs, weil ein Daten-URI keine
       CSS-Variable lesen kann. Als Inline-SVG folgt sie dem Thema von selbst. -->
  <svg class="rosette" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <g fill="var(--ornament-rosette-petal)" stroke="var(--ornament-rosette-line)" stroke-width=".8">
      <path
        v-for="a in [0, 45, 90, 135, 180, 225, 270, 315]"
        :key="a"
        d="M12,2.5C14.7,6.3 14.7,9.3 12,12C9.3,9.3 9.3,6.3 12,2.5Z"
        :transform="`rotate(${a} 12 12)`"
      />
    </g>
    <circle cx="12" cy="12" r="3" fill="var(--ornament-rosette-line)" />
    <circle cx="12" cy="12" r="1.2" fill="var(--ornament-rosette-eye)" />
  </svg>
</template>

<style scoped>
/* Mitlaufend mit der Textgröße, leicht kleiner als die Zeile — so wie das
   Zeichen säße, an dessen Stelle sie steht. */
.rosette {
  display: inline-block;
  vertical-align: -0.18em;
  width: 1.05em;
  height: 1.05em;
  margin-inline: 0.14em;
}
</style>
