import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/** Отдельная сборка только для /m/* — без dashboard, SEO, admin. */
export default defineConfig({
  base: '/booking-assets/',
  define: {
    'import.meta.env.VITE_BOOKING_APP': JSON.stringify('1'),
  },
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom', 'react-helmet-async'],
    alias: {
      '@': resolve(__dirname, '../frontend/src'),
      react: resolve(__dirname, 'node_modules/react'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom'),
      'react-router-dom': resolve(__dirname, 'node_modules/react-router-dom'),
      'react-helmet-async': resolve(__dirname, 'node_modules/react-helmet-async'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'safari14',
    modulePreload: { polyfill: true },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
        },
      },
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
