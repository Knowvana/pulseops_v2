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
  logger.info('API event: POST /database/test-connection', { host: req.body?.host, database: req.body?.database });
  try {
    const result = await DatabaseService.testConnection(req.body);
    logger.info('Database connection test successful', { host: req.body?.host, database: req.body?.database });
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
  logger.info('API event: GET /database/test-connection (server config)');
  try {
    const result = await DatabaseService.testConnection();
    logger.info('Database connection test (server config) successful');
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

// ── GET /database/save-config (Public) ───────────────────────────────────────
router.get('/save-config', async (_req, res) => {
  logger.info('API event: GET /database/save-config');
  try {
    const dbConfig = loadJson('DatabaseConfig.json');
    let defaultAdmin = { email: '' };
    try {
      const adminData = loadJson('DefaultAdminUser.json');
      if (adminData?.users?.[0]?.email) {
        defaultAdmin = { email: adminData.users[0].email };
      }
    } catch { /* no admin file yet */ }
    res.json({
      success: true,
      data: {
        ...dbConfig,
        tables: ['system_users', 'system_config', 'system_modules', 'system_logs'],
        defaultAdmin,
      },
    });
  } catch (err) {
    logger.warn('DatabaseConfig.json not found, returning empty config', { error: err.message });
    res.json({
      success: true,
      data: {
        host: '',
        port: '',
        database: '',
        schema: '',
        user: '',
        password: '',
        tables: [],
        defaultAdmin: { email: '' },
      },
    });
  }
});

// ── POST /database/save-config (Public) ─────────────────────────────────────
router.post('/save-config', async (req, res) => {
  logger.info('API event: POST /database/save-config', { host: req.body?.host, database: req.body?.database });
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
  logger.info('API event: POST /database/create-database');
  try {
    const result = await DatabaseService.createDatabase();
    logger.info('Database created successfully', result);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(errors.errors.dbCreateFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || errors.errors.dbCreateFailed } });
  }
});

// ── DELETE /database/delete-database (Protected) ────────────────────────────
router.delete('/delete-database', authenticate, async (req, res) => {
  logger.info('API event: DELETE /database/delete-database', { user: req.user?.email });
  try {
    const result = await DatabaseService.dropDatabase();
    logger.info('Database deleted successfully', { user: req.user?.email });
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(errors.errors.dbDeleteFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || errors.errors.dbDeleteFailed } });
  }
});

// ── GET /database/schema-status (Public) ────────────────────────────────────
router.get('/schema-status', async (_req, res) => {
  logger.info('API event: GET /database/schema-status');
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
  logger.info('API event: POST /database/create-schema');
  try {
    const result = await DatabaseService.createSchema();
    logger.info('Schema created successfully');
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(errors.errors.schemaInitFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || errors.errors.schemaInitFailed } });
  }
});

// ── POST /database/load-default-data (Public) ──────────────────────────────
router.post('/load-default-data', async (_req, res) => {
  logger.info('API event: POST /database/load-default-data');
  try {
    const result = await DatabaseService.loadDefaultData();
    logger.info('Default data loaded successfully');
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(errors.errors.dbInitFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || errors.errors.dbInitFailed } });
  }
});

// ── DELETE /database/load-default-data (Public) ─────────────────────────────
router.delete('/load-default-data', async (_req, res) => {
  logger.info('API event: DELETE /database/load-default-data');
  try {
    const result = await DatabaseService.cleanDefaultData();
    logger.info('Default data cleaned successfully');
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Failed to clean default data', { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── POST /database/wipe (Protected) ────────────────────────────────────────
router.post('/wipe', authenticate, async (req, res) => {
  logger.info('API event: POST /database/wipe', { user: req.user?.email });
  try {
    const result = await DatabaseService.wipeDatabase();
    logger.info('Database wiped successfully', { user: req.user?.email });
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(errors.errors.dbWipeFailed, { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message || errors.errors.dbWipeFailed } });
  }
});

// ── GET /database/stats (Protected) ────────────────────────────────────────
router.get('/stats', authenticate, async (req, res) => {
  logger.info('API event: GET /database/stats', { user: req.user?.email });
  try {
    const result = await DatabaseService.getStats();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Failed to get database stats', { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
