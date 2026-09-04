/* Ob die Doppelseite ANGEBOTEN wird — großes Querformat, wie die Vorlage
   (SPREAD_MQ). Ob sie erscheint, entscheidet die Person über den
   „Zwei Seiten"-Chip; der Zustand liegt im Reader-Store. Eine Automatik
   stand hier zuerst und halbierte auf einem Laptop ungefragt die
   Blattbreite. */

import { onBeforeUnmount, onMounted, ref } from 'vue'

const QUERY = '(min-width: 900px) and (min-height: 600px) and (orientation: landscape)'

export function useSpread() {
  const offered = ref(false)
  let mq: MediaQueryList | null = null
  const update = () => {
    offered.value = mq?.matches ?? false
  }

  onMounted(() => {
    mq = window.matchMedia(QUERY)
    mq.addEventListener('change', update)
    update()
  })
  onBeforeUnmount(() => mq?.removeEventListener('change', update))

  return { offered }
}
