import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendTarget = process.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/api': backendTarget,
      '/health': backendTarget,
    },
  },
});
