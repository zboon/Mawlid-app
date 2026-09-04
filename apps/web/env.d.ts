/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface ImportMetaEnv {
  /* Wohin die API zeigt. Leer bedeutet „gleiche Herkunft" — richtig, sobald
     ein Reverse-Proxy beides unter einem Namen ausliefert. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
