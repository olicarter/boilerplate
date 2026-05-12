import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.ANALYZE ? [visualizer({ open: true, filename: 'dist/stats.html', gzipSize: true, brotliSize: true })] : []),
  ],
  server: {
    port: 5173,
    hmr: {
      clientPort: 5174,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-tanstack': ['@tanstack/react-router', '@tanstack/react-db', '@tanstack/db'],
          'vendor-electric': ['@electric-sql/client', '@tanstack/electric-db-collection'],
          'vendor-markdown': ['marked', 'dompurify'],
          'vendor-auth': ['@simplewebauthn/browser'],
        },
      },
    },
  },
});
