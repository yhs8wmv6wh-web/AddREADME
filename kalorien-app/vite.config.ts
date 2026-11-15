import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.GITHUB_PAGES ? '/AddREADME/kalorien/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/icon.svg'],
      manifest: {
        name: 'Kalorien',
        short_name: 'Kalorien',
        description: 'Kalorien, Makros und Mikronährstoffe tracken – mit Barcode-Scanner, Rezept-PDF-Import und festen Trainings.',
        theme_color: '#064e3b',
        background_color: '#064e3b',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: `${base}icons/icon.svg`, sizes: '192x192', type: 'image/svg+xml' },
          { src: `${base}icons/icon.svg`, sizes: '512x512', type: 'image/svg+xml' },
          { src: `${base}icons/icon.svg`, sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
