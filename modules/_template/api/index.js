// ============================================================================
// Module API Entry Point Template — PulseOps V2
//
// PURPOSE: API entry point for a plug-and-play module. This file is loaded
// dynamically by dynamicRouteLoader.js when the module is enabled.
//
// EXPORTS:
//   - default: Express Router (mounted at /api/<moduleId>)
//   - router:  Express Router (named alias)
//   - onEnable:  async () => void — Called when module is enabled
//   - onDisable: async () => void — Called when module is disabled
//
// NOTES:
//   - Authentication is applied automatically by the dynamic route loader
//   - Config files should be stored in api/config/ alongside this file
//   - This file is copied as-is to dist-modules/<moduleId>/api/index.js
// ============================================================================
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// ── Config file paths ────────────────────────────────────────────────────────
const CONFIG_DIR = path.resolve(__dirname, 'config');

// ── Helper: read/write JSON config ──────────────────────────────────────────
function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ═════════════════════════════════════════════════════════════════════════════
// ROUTES — Add your module's API endpoints here
// ═════════════════════════════════════════════════════════════════════════════

// Example: GET /<moduleId>/health
router.get('/health', (req, res) => {
  return res.json({ success: true, data: { status: 'ok', module: 'my_module' } });
});

// ═════════════════════════════════════════════════════════════════════════════
// LIFECYCLE HOOKS
// ═════════════════════════════════════════════════════════════════════════════

export async function onEnable() {
  // Initialize config directory and default config files
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export async function onDisable() {
  // Cleanup resources (clear caches, close connections, etc.)
}

export { router };
export default router;
