import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildId = process.env.BUILD_ID || String(Date.now())

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [
    react(),
    {
      name: 'inject-build-id',
      transformIndexHtml(html) {
        return html.replace(
          '</head>',
          `  <meta name="app-build" content="${buildId}" />\n  </head>`
        );
      },
    },
    {
      name: 'strip-crossorigin',
      transformIndexHtml(html) {
        return html.replace(/ crossorigin/g, '');
      },
    },
    {
      name: 'strip-dev-entry-tag',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          return html.replace(/\s*<script type="module" src="\/src\/main\.jsx"[^>]*><\/script>/g, '');
        },
      },
    },
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true }
    }
  },
  build: {
    outDir: 'dist',
    base: '/',
    target: 'safari14',
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@sentry')) return 'sentry';
          if (id.includes('react-router')) return 'react-router';
          if (id.includes('axios')) return 'axios';
          if (id.includes('leaflet')) return 'leaflet';
          if (id.includes('moment')) return 'moment';
          return 'vendor';
        },
      },
    },
  }
})
