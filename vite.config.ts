import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.GITHUB_PAGES ? '/AddREADME/' : '/'

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
        name: 'Bücherregal',
        short_name: 'Bücherregal',
        description: 'Digitales Bücherregal – trage gelesene Bücher ein und behalte den Überblick.',
        theme_color: '#1f2028',
        background_color: '#1f2028',
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
