import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // En local, `netlify dev` sirve las funciones en :8888
  server: { proxy: { '/api': 'http://localhost:8888' } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Gym — mi seguimiento',
        short_name: 'Gym',
        description: 'Rutina de gimnasio que se ajusta a cómo sientes cada ejercicio',
        theme_color: '#0b1120',
        background_color: '#0b1120',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
        // Las imágenes de ejercicios se cachean al verlas, para que funcione con mala señal
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/ex/'),
            handler: 'CacheFirst',
            options: { cacheName: 'exercise-images', expiration: { maxEntries: 400 } },
          },
        ],
      },
    }),
  ],
})
