import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// Wird unter https://yhs8wmv6wh-web.github.io/AddREADME/ (GitHub Pages) gehostet,
// deshalb der Unterpfad als base.
const BASE = '/AddREADME/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon.svg'],
      manifest: {
        name: 'Kulturliste',
        short_name: 'Kulturliste',
        description: 'Einfache Liste für Kultur-Aktivitäten – Titel eintragen, Kategorie wählen, abhaken, löschen.',
        theme_color: '#1f2028',
        background_color: '#1f2028',
        display: 'standalone',
        scope: BASE,
        start_url: BASE,
        icons: [
          { src: `${BASE}icons/icon.svg`, sizes: '192x192', type: 'image/svg+xml' },
          { src: `${BASE}icons/icon.svg`, sizes: '512x512', type: 'image/svg+xml' },
          { src: `${BASE}icons/icon.svg`, sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
})
