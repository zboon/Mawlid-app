import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  /* Muss ein absoluter Pfad sein, kein './'. Der Router bekommt denselben Wert
     als Basis, und mit './' passt dann keine einzige Route mehr — die Seite
     rendert die Kopfleiste und darunter nichts, ohne Fehlermeldung.

     Lokal ist '/' richtig. Für einen Unterpfad wie GitHub Pages, wo die alte
     App unter /Mawlid-app/ liegt, wird beim Bauen BASE_PATH gesetzt:
         BASE_PATH=/Mawlid-app/ npm run build                                */
  const base = env.BASE_PATH || '/'

  return {
    base,
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        /* Die Zod-Schemas der API. Die Oberfläche importiert daraus nur
           `import type` — der Alias ist die Rückfalllinie, falls doch einmal
           ein Wert importiert wird, damit das als Bündelgröße auffällt und
           nicht als Auflösungsfehler. */
        '@mawalid/shared': fileURLToPath(
          new URL('../../packages/shared/src/index.ts', import.meta.url),
        ),
      },
    },
    server: { port: 5173 },
    preview: { port: 4173 },
  }
})
