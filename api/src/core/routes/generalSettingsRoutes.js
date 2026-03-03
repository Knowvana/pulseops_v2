// ============================================================================
// General Settings Routes — PulseOps V2 API
//
// PURPOSE: CRUD endpoints for general platform settings stored in
// GeneralSettings.json. File-based (no DB required). Currently supports
// timezone configuration; more settings will be added gradually.
//
// ENDPOINTS:
//   GET  /general-settings     → Get current general settings
//   POST /general-settings     → Update general settings
//
// ARCHITECTURE: Uses loadJson/saveJson for file persistence.
// ============================================================================
import { Router } from 'express';
import { loadJson, saveJson } from '#shared/loadJson.js';
import { logger } from '#shared/logger.js';

const router = Router();
const CONFIG_FILE = 'GeneralSettings.json';

// ── GET /general-settings — Read current settings ───────────────────────────
router.get('/', (_req, res) => {
  try {
    const settings = loadJson(CONFIG_FILE);
    res.json({ success: true, data: settings });
  } catch (err) {
    logger.error('Failed to read general settings', { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// ── POST /general-settings — Update settings ────────────────────────────────
router.post('/', (req, res) => {
  try {
    const current = loadJson(CONFIG_FILE);
    const updated = { ...current, ...req.body };
    saveJson(CONFIG_FILE, updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error('Failed to save general settings', { error: err.message });
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
