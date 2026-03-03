// ============================================================================
// Vite Configuration — PulseOps V2
//
// PURPOSE: Development server, build config, and path aliases for the
// frontend React application. Proxies /api to the backend.
//
// ALIASES: @config, @core, @modules, @shared map to src/ subdirectories.
// URL/PORT: Centralized in src/config/urls.json (single source of truth)
// ============================================================================
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const urlsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/config/urls.json'), 'utf-8'));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, 'src'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@modules': path.resolve(__dirname, 'src/modules'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@layouts': path.resolve(__dirname, 'src/layouts'),
    },
  },
  server: {
    port: urlsConfig.server.ui.port,
    proxy: {
      '/api': {
        target: urlsConfig.server.api.url,
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error(`[Proxy Error] Failed to connect to API server at ${urlsConfig.server.api.url}`);
            console.error(`[Proxy Error] ${err.message}`);
            
            // Return 503 Service Unavailable instead of 500
            if (res.writeHead) {
              res.writeHead(503, {
                'Content-Type': 'application/json',
              });
              res.end(JSON.stringify({
                success: false,
                error: {
                  message: `API server is unavailable. Please ensure the backend is running at ${urlsConfig.server.api.url}`,
                  code: 'SERVICE_UNAVAILABLE',
                  details: err.code || err.message
                }
              }));
            }
          });
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
