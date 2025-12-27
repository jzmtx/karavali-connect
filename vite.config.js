import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Karavali Connect',
        short_name: 'Karavali',
        description: 'Clean Karavali, Earn Rewards, Stay Safe',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      // Don't inject workbox into firebase-messaging-sw.js
      injectManifest: {
        injectionPoint: undefined
      }
    })
  ],
  server: {
    port: 3000,
    open: true
  },
  // Ensure service worker files are copied to dist
  publicDir: 'public'
})

