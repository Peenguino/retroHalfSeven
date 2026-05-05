import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      manifest: {
        name: "Retro Half Seven",
        short_name: "RetroHalf7",
        start_url: "/",
        display: "standalone",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          }
        ]
      },
      // Acquisizione del service-worker.ts, altrimenti non atteso così ma come sw.ts
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      
      // Definito così dato che non vogliamo comportamenti di default
      // stiamo infatti definendo il caching in modo custom
      injectManifest: {
        injectionPoint: undefined
      },

      // Try per abilitare sw in sviluppo con npm run dev
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ]
})