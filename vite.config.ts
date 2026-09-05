import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  // When deployed to GitHub Pages via GitHub Actions, assets are served from /sol-amigo-pro/.
  // In development, Google AI Studio preview, and Cloud Run, the app must be served from '/'
  // so health checks and the preview iframe load correctly at the domain root.
  base: process.env.VITE_BASE_PATH || (process.env.GITHUB_ACTIONS === 'true' ? '/sol-amigo-pro/' : '/'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true as const,
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
}));
