/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const MEDIAPIPE_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MEDIAPIPE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'La Barba — Asesor de perfilado',
        short_name: 'La Barba',
        description:
          'Analiza tu rostro y te guía para recortar y perfilar la barba con AR en vivo.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0b0f',
        theme_color: '#0b0b0f',
        categories: ['lifestyle', 'utilities'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Cache the MediaPipe WASM + model as they are large and immutable.
        runtimeCaching: [
          {
            urlPattern: new RegExp(`${escapeRegExp(MEDIAPIPE_WASM)}/.*`),
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-wasm',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: new RegExp(escapeRegExp(MEDIAPIPE_MODEL)),
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-model',
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    host: true,
    // getUserMedia requires a secure context; expose over LAN via HTTPS-less
    // loopback is allowed on desktop, but mobile needs a tunnel (see README).
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: { provider: 'v8', include: ['src/features/**', 'src/lib/**'] },
  },
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
