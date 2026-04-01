import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // NestJS API
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // ElectricSQL sync service — /electric/v1/shape -> http://localhost:3000/v1/shape
      '/electric': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/electric/, ''),
      },
    },
  },
});
