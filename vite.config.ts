import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.js.org/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Use '/ucds/' base path for GitHub Pages subfolder deployment by default,
  // or '/' if a custom domain (e.g. ucds.ca via Cloudflare) or root deployment is configured.
  base: process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/ucds/' : '/'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
});
