import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Content-Security-Policy is injected into the built page only: the dev server
// relies on inline scripts for hot reload. connect-src allows https/http because
// the HTTP request builder sends to a URL the user types; nothing else fetches.
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self' https: http:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const cspPlugin = (): Plugin => ({
  name: 'opskit-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
    ),
});

export default defineConfig({
  base: '/opskit/',
  plugins: [
    react(),
    cspPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'opskit',
        short_name: 'opskit',
        description: 'Client-side DevOps/SRE toolbox. Your data never leaves the browser.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/opskit/',
        scope: '/opskit/',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        navigateFallback: '/opskit/index.html',
      },
    }),
  ],
  build: {
    target: 'es2022',
    modulePreload: { polyfill: false }, // the polyfill is the only other fetch() in the bundle
    chunkSizeWarningLimit: 300,
  },
  worker: { format: 'es' },
});
