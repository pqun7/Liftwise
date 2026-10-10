import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const REPDB_MEDIA_CACHE_NAME = 'liftwise-repdb-media-9ed9357f09c7';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['app-icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Liftwise',
        short_name: 'Liftwise',
        description: 'A private, offline-first workout companion.',
        id: '/',
        start_url: '/?app=1',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#001a14',
        theme_color: '#001a14',
        categories: ['fitness', 'health', 'lifestyle'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        navigateFallback: '/index.html',
        // Only three bundled Home photographs; the full RepDB pack stays opt-in.
        globPatterns: ['**/*.{js,css,html,json,svg,woff2,ttf}', 'assets/*.{webp,png}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/repdb-media/flat/'),
            handler: 'CacheFirst',
            options: {
              cacheName: REPDB_MEDIA_CACHE_NAME,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 1_200, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    testTimeout: 15_000,
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
    },
  },
});
