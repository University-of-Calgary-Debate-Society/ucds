import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.js.org/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production' || command === 'build' || process.env.NODE_ENV === 'production' || Boolean(process.env.GITHUB_ACTIONS);
  // Use '/ucds/' base path for GitHub Pages subfolder deployment by default,
  // or '/' if a custom domain (e.g. ucds.ca via Cloudflare) or root deployment is configured.
  const base = process.env.VITE_BASE_PATH || (isProduction ? '/ucds/' : '/');

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
