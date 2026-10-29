import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        workbox: {
          cleanupOutdatedCaches: true,
          navigateFallbackDenylist: [/^\/api(?:\/|$)/],
          runtimeCaching: [{ urlPattern: /\/api\//, handler: 'NetworkOnly', method: 'GET' }],
        },
        manifest: {
          id: '/',
          name: 'CiroX — Şube ve Finans Yönetimi',
          short_name: 'CiroX',
          lang: 'tr',
          description: 'Şubelerin ciro, gider ve finansal performansını takip edin.',
          theme_color: '#09090b',
          background_color: '#09090b',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
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
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': { target: 'http://127.0.0.1:4002', changeOrigin: true },
      },
      hmr: true,
      headers: { 'Cache-Control': 'no-store' },
      watch: { usePolling: true, interval: 300, ignored: ['**/backend/**', '**/.npm-cache/**', '**/dist/**'] },
    },
  };
});
