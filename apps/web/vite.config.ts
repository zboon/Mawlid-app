import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

/* Die .env liegt im Projektwurzelverzeichnis, nicht hier. Ohne diese Zeile
   sucht Vite sie in apps/web und findet nichts — VITE_API_URL bliebe leer,
   jede Anfrage ginge an den Vite-Server selbst und käme als 404 zurück.
   Genau das ist beim ersten Aufsetzen passiert. */
const projectRoot = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '')

  /* Muss ein absoluter Pfad sein, kein './'. Der Router bekommt denselben Wert
     als Basis, und mit './' passt dann keine einzige Route mehr — die Seite
     rendert die Kopfleiste und darunter nichts, ohne Fehlermeldung.

     Lokal ist '/' richtig. Für einen Unterpfad wie GitHub Pages, wo die alte
     App unter /Mawlid-app/ liegt, wird beim Bauen BASE_PATH gesetzt:
         BASE_PATH=/Mawlid-app/ npm run build                                */
  const base = env.BASE_PATH || '/'

  /* Im Entwicklungsbetrieb leitet Vite /api an die API weiter. Damit läuft
     alles über EINE Herkunft: kein CORS, keine zweite Adresse in der
     Konfiguration, und http://localhost:5173/api/content/modules lässt sich
     im Browser aufrufen. VITE_API_URL braucht man nur, wenn die API woanders
     steht — dann gilt sie und die Weiterleitung bleibt ungenutzt. */
  const apiTarget = env.API_PROXY_TARGET || `http://127.0.0.1:${env.API_PORT || 3000}`

  return {
    base,
    envDir: projectRoot,
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
    server: {
      port: 5173,
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
    preview: {
      port: 4173,
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
  }
})
