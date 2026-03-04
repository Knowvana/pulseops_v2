// ============================================================================
// Log Routes — PulseOps V2 API
//
// PURPOSE: REST endpoints for log management. Supports reading, writing,
// deleting, and configuring logs for both UI and API log types.
//
// ENDPOINTS:
//   GET    /logs/settings          → Get current logging configuration
//   PUT    /logs/settings          → Update logging configuration (storage mode)
//   GET    /logs/settings/status   → Check if DB logging tables exist
//   POST   /logs/settings/tables   → Create log tables in database
//   GET    /logs/stats           → Get stats for both log types
//   GET    /logs/:type           → Get logs (type = ui | api)
//   POST   /logs/:type           → Write log entries (push from UI)
//   DELETE /logs/:type           → Delete all logs for a type
//   GET    /logs/:type/stats     → Get stats for a specific log type
//
// ARCHITECTURE: Uses LogService for all operations. Storage mode
// (file vs database) is transparent to the caller.
// ============================================================================
import { Router } from 'express';
import LogService from '#core/services/logService.js';
import { messages, errors } from '#shared/loadJson.js';
import { logger } from '#shared/logger.js';

const router = Router();

// ── GET /logs/settings — Get current logging configuration ──────────────────
router.get('/settings', (_req, res) => {
  try {
    const config = LogService.getConfig();
    res.json({ success: true, data: config });
  } catch (err) {
    logger.error('Failed to read log config', { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── PUT /logs/settings — Update storage mode ────────────────────────────────
router.put('/settings', async (req, res) => {
  try {
    const { storage } = req.body;
    if (!storage || !['file', 'database'].includes(storage)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid storage mode. Must be "file" or "database".' },
      });
    }
    await LogService.setStorageMode(storage);
    res.json({
      success: true,
      data: { storage, message: `Log storage switched to ${storage}.` },
    });
  } catch (err) {
    logger.error('Failed to update log config', { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── GET /logs/settings/status — Check if DB log tables exist ────────────────
router.get('/settings/status', async (_req, res) => {
  try {
    const available = await LogService.isDatabaseLoggingAvailable();
    const config = LogService.getConfig();
    res.json({
      success: true,
      data: {
        storage: config.storage,
        databaseAvailable: available,
      },
    });
  } catch (err) {
    res.json({
      success: true,
      data: { storage: 'file', databaseAvailable: false },
    });
  }
});

// ── POST /logs/settings/tables — Create log tables in database ──────────────
router.post('/settings/tables', async (_req, res) => {
  try {
    const result = await LogService.createLogTables();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Failed to create log tables', { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── GET /logs/stats — Get stats for both log types ───────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const stats = await LogService.getAllStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    logger.error('Failed to get log stats', { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── GET /logs/:type — Read logs ──────────────────────────────────────────────
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    if (!['ui', 'api'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid log type. Must be "ui" or "api".' },
      });
    }
    const { level, search, module: logModule, limit, offset } = req.query;
    const logs = await LogService.getLogs(type, {
      level,
      search,
      module: logModule,
      limit: limit ? parseInt(limit, 10) : 500,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({ success: true, data: { logs, count: logs.length } });
  } catch (err) {
    logger.error('Failed to read logs', { error: err.message, type: req.params.type });
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── POST /logs/:type — Write log entries (push from UI or batch) ─────────────
router.post('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    if (!['ui', 'api'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid log type. Must be "ui" or "api".' },
      });
    }
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Request body must contain a non-empty "entries" array.' },
      });
    }
    const result = await LogService.writeLogs(type, entries);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Failed to write logs', { error: err.message, type: req.params.type });
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── DELETE /logs/:type — Delete all logs for a type ──────────────────────────
router.delete('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    if (!['ui', 'api'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid log type. Must be "ui" or "api".' },
      });
    }
    const result = await LogService.deleteLogs(type);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Failed to delete logs', { error: err.message, type: req.params.type });
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── GET /logs/:type/stats — Get stats for a specific log type ────────────────
router.get('/:type/stats', async (req, res) => {
  try {
    const { type } = req.params;
    if (!['ui', 'api'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid log type. Must be "ui" or "api".' },
      });
    }
    const stats = await LogService.getStats(type);
    res.json({ success: true, data: stats });
  } catch (err) {
    logger.error('Failed to get log stats', { error: err.message, type: req.params.type });
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
