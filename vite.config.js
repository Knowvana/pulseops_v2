// ============================================================================
// Vite Configuration — PulseOps V2
//
// PURPOSE: Development server, build config, and path aliases for the
// frontend React application. Proxies /api to the backend.
//
// ALIASES: @config, @core, @modules, @shared map to src/ subdirectories.
// ============================================================================
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@config': path.resolve(__dirname, 'src/config'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@modules': path.resolve(__dirname, 'src/modules'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', () => {});
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/shared/test/setup.js',
  },
});
