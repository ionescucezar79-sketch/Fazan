import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // BASE=/fazan/ pe GitHub Pages; '/' local si pe Firebase
  base: process.env.BASE ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.svg'],
      manifest: {
        name: 'Fazan',
        short_name: 'Fazan',
        description: 'Jocul de cuvinte Fazan, contra botului.',
        lang: 'ro',
        start_url: '.',
        display: 'standalone',
        background_color: "#1c1511",
        theme_color: "#1c1511",
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Aplicatia intra in precache; dictionarul (~14 MB) NU, se pune in cache la cerere.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['dict/**', 'def/**'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // definitiile se salveaza doar cand le ceri
            urlPattern: ({ url }) => url.pathname.includes('/def/') && url.pathname.endsWith('.json'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'fazan-definitii-v1',
              expiration: { maxEntries: 800 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/dict/') && url.pathname.endsWith('.json'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'fazan-dictionar-v1', // schimba versiunea cand regenerezi dictionarul
              expiration: { maxEntries: 400 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: { environment: 'node' },
});
