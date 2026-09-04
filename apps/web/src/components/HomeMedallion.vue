<template>
  <!-- Der Anker des Rasters, kein Modul: die Kalligrafie sitzt fest in der
       Mittelzelle, egal wie viele Bereiche es gibt. -->
  <div class="medallion" aria-hidden="true">
    <span class="mark" />
  </div>
</template>

<style scoped>
.medallion {
  display: grid;
  place-items: center;
  /* Immer ein Kreis, unabhängig davon, wie die Rasterzelle geformt ist —
     sonst wird daraus im zweispaltigen Layout eine breite Ellipse. */
  aspect-ratio: 1;
  justify-self: center;
  max-width: 100%;
  max-height: 100%;
  border-radius: var(--radius-circle);
  border: 1px solid var(--accent-line-soft);
  background: radial-gradient(circle, var(--surface-card), transparent 70%);
  padding: var(--space-sm);
}

/* Die Kalligrafie liegt als weiße PNG vor — sie war für den grünen Kopf
   gemacht und verschwindet auf Papierton fast vollständig. Als Maske statt
   als Bild bekommt sie ihre Farbe aus einem Token und folgt damit dem Thema,
   in beiden Richtungen. Das ist zugleich die Vorstufe zu dem, was die
   Dokumentation empfiehlt: die Kalligrafie als SVG nachzuzeichnen. */
.mark {
  display: block;
  /* Beide Maße gesetzt, nicht nur die Breite: `contain` passt die Maske in
     die Box ein, aber nur wenn die Box eine Höhe hat. Mit aspect-ratio statt
     height läuft sie aus einer flachen Zelle heraus. */
  width: 72%;
  height: 72%;
  background: var(--ink-accent);
  -webkit-mask: url('/img/logo-inner.png') center / contain no-repeat;
  mask: url('/img/logo-inner.png') center / contain no-repeat;
  opacity: 0.85;
}
</style>
