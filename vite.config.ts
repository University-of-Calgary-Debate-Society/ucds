import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.js.org/config/
export default defineConfig(() => {
  // Use '/' base path for custom domain (ucds.ca via Cloudflare/GitHub Pages) and local dev.
  // Can be overridden by VITE_BASE_PATH if ever deploying to a subfolder.
  const base = process.env.VITE_BASE_PATH || '/';

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    base,
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
  };
});
