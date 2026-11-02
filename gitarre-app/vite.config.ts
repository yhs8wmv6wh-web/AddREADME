import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.GITHUB_PAGES ? '/AddREADME/gitarre/' : '/'

// https://vite.dev/config/
// Modus "artifact": eine einzige HTML-Datei für claude.ai-Artefakte (ohne PWA).
export default defineConfig(({ mode }) => mode === 'artifact' ? {
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { 'virtual:pwa-register/react': '/src/stubs/pwa-register.ts' } },
  build: {
    outDir: 'dist-artifact',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    modulePreload: false,
    rolldownOptions: { output: { codeSplitting: false } },
  },
} : {
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/icon.svg'],
      manifest: {
        name: 'Gitarre üben',
        short_name: 'Gitarre',
        description: 'Gitarre lernen mit eigenen Songs: Akkorde, Tabs, Akkordwechsel-Trainer, Metronom und Stimmgerät.',
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
