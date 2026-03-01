// ============================================================================
// Server Entry Point — PulseOps V2 API
//
// PURPOSE: Bootstraps the Express application and starts the HTTP server.
// Implements graceful shutdown for Kubernetes readiness.
//
// ARCHITECTURE: Imports the Express app factory, binds to the configured
// port, and handles SIGTERM/SIGINT for zero-downtime deployments.
// ============================================================================
import { createApp } from './app.js';
import { config } from './config/index.js';

const app = createApp();
const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`PulseOps V2 API started on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});

// --- Graceful Shutdown (K8s Ready) ---
const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  // Force exit after 10s if connections aren't closing
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
