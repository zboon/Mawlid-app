/* Doppelseite: auf großen Querformat-Bildschirmen zeigt die Buchansicht zwei
   Blätter nebeneinander, wie ein aufgeschlagenes Buch. */

import { onBeforeUnmount, onMounted, ref } from 'vue'

const QUERY = '(min-width: 900px) and (min-height: 600px) and (orientation: landscape)'

export function useSpread() {
  const spread = ref(false)
  let mq: MediaQueryList | null = null
  const update = () => {
    spread.value = mq?.matches ?? false
  }

  onMounted(() => {
    mq = window.matchMedia(QUERY)
    mq.addEventListener('change', update)
    update()
  })
  onBeforeUnmount(() => mq?.removeEventListener('change', update))

  return { spread }
}
