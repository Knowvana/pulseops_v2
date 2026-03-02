// ============================================================================
// Database Routes — PulseOps V2 API
//
// PURPOSE: REST endpoints for database configuration, connection testing,
// schema management, and data operations.
//
// AUTH STRATEGY (Selective):
//   - Public (no auth): setup/status routes (called before any user exists)
//     test-connection, save-config, schema-status, create-database,
//     create-schema, load-default-data, clean-default-data
//   - Protected (JWT required): destructive routes only
//     wipe, stats, delete-database
//
// ENDPOINTS:
//   POST   /database/test-connection    — Test DB connection (public)
//   GET    /database/test-connection    — Test with server config (public)
//   POST   /database/save-config       — Save DB config to DatabaseConfig.json (public)
//   POST   /database/create-database    — Create the database if not exists (public)
//   DELETE /database/delete-database    — Drop the database entirely (protected)
//   GET    /database/schema-status      — Check schema initialization state (public)
//   POST   /database/create-schema      — Create core schema and tables (public)
//   POST   /database/load-default-data  — Seed default admin user + config (public)
//   DELETE /database/load-default-data  — Clean default data (public)
//   POST   /database/wipe               — Drop entire schema (protected)
//   GET    /database/stats              — Table sizes and counts (protected)
//
// DEPENDENCIES:
//   - ../database/databaseService.js → all database operations
//   - ../middleware/auth.js → authenticate, requireRole
//   - ../../shared/loadJson.js → messages, errors, saveJson
//   - ../../shared/logger.js → structured logging
// ============================================================================
import { Router } from 'express';
import DatabaseService from '#core/database/databaseService.js';
import { authenticate } from '#core/middleware/auth.js';
import { messages, errors, saveJson, loadJson } from '#shared/loadJson.js';
import { logger } from '#shared/logger.js';

const router = Router();

// ── POST /database/test-connection (Public) ─────────────────────────────────
router.post('/test-connection', async (req, res) => {
  try {
    const result = await DatabaseService.testConnection(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(errors.errors.dbConnectionFailed, { error: err.message });
    const isDbNotExist = err.message?.includes('does not exist');
    res.json({
      success: false,
      error: {
        message: err.message || errors.errors.dbConnectionFailed,
        code: isDbNotExist ? 'DB_NOT_EXIST' : 'CONNECTION_FAILED',
      },
    });
  }
});

// ── GET /database/test-connection (Public) ──────────────────────────────────
router.get('/test-connection', async (_req, res) => {
  try {
    const result = await DatabaseService.testConnection();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(errors.errors.dbConnectionFailed, { error: err.message });
    const isDbNotExist = err.message?.includes('does not exist');
    res.json({
      success: false,
      error: {
        message: err.message || errors.errors.dbConnectionFailed,
        code: isDbNotExist ? 'DB_NOT_EXIST' : 'CONNECTION_FAILED',
      },
    });
  }
});

// ── POST /database/save-config (Public) ─────────────────────────────────────
router.post('/save-config', async (req, res) => {
  try {
    const { host, port, database, schema, username, password } = req.body;
    const dbConfig = {
      host: host || 'localhost',
      port: parseInt(port, 10) || 5432,
      database: database || 'pulseops_v2',
      schema: schema || 'pulseops',
      user: username || 'postgres',
      password: password || '',
      ssl: false,
      poolSize: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
    saveJson('DatabaseConfig.json', dbConfig);
    logger.info(messages.success.dbConfigSaved, { host, database });
    res.json({ success: true, data: { message: messages.success.dbConfigSaved, config: dbConfig } });
  } catch (err) {
    logger.error(errors.errors.dbConfigSaveFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: errors.errors.dbConfigSaveFailed } });
  }
});

// ── POST /database/create-database (Public) ─────────────────────────────────
router.post('/create-database', async (_req, res) => {
  try {
    const result = await DatabaseService.createDatabase();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(errors.errors.dbCreateFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || errors.errors.dbCreateFailed } });
  }
});

// ── DELETE /database/delete-database (Protected) ────────────────────────────
router.delete('/delete-database', authenticate, async (req, res) => {
  try {
    const result = await DatabaseService.dropDatabase();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(errors.errors.dbDeleteFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || errors.errors.dbDeleteFailed } });
  }
});

// ── GET /database/schema-status (Public) ────────────────────────────────────
router.get('/schema-status', async (_req, res) => {
  try {
    const result = await DatabaseService.getSchemaStatus();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(errors.errors.schemaInitFailed, { error: err.message });
    res.json({ success: true, data: { connected: false, initialized: false, hasDefaultData: false } });
  }
});

// ── POST /database/create-schema (Public) ───────────────────────────────────
router.post('/create-schema', async (_req, res) => {
  try {
    const result = await DatabaseService.createSchema();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(errors.errors.schemaInitFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || errors.errors.schemaInitFailed } });
  }
});

// ── POST /database/load-default-data (Public) ──────────────────────────────
router.post('/load-default-data', async (_req, res) => {
  try {
    const result = await DatabaseService.loadDefaultData();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(errors.errors.dbInitFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || errors.errors.dbInitFailed } });
  }
});

// ── DELETE /database/load-default-data (Public) ─────────────────────────────
router.delete('/load-default-data', async (_req, res) => {
  try {
    const result = await DatabaseService.cleanDefaultData();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── POST /database/wipe (Protected) ────────────────────────────────────────
router.post('/wipe', authenticate, async (req, res) => {
  try {
    const result = await DatabaseService.wipeDatabase();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(errors.errors.dbWipeFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || errors.errors.dbWipeFailed } });
  }
});

// ── GET /database/stats (Protected) ────────────────────────────────────────
router.get('/stats', authenticate, async (req, res) => {
  try {
    const result = await DatabaseService.getStats();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
