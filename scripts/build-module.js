// ============================================================================
// Build Module Script — PulseOps V2
//
// PURPOSE: CLI script to build individual add-on modules as standalone
// deployable packages into dist-modules/<moduleId>/. The output includes:
//   - manifest.js      → Compiled UI bundle (Vite library-mode ES module)
//   - constants.json   → Module metadata (for moduleScanner discovery)
//   - api/             → API routes + config (copied as-is for dynamic loading)
//
// MODULE SOURCE LAYOUT (modules/<moduleId>/):
//   modules/<moduleId>/
//     ├── api/                  → API routes + services + config (Node.js)
//     │   ├── config/           → JSON config files (connection, defaults)
//     │   └── index.js          → API entry point (exports router + hooks)
//     └── ui/                   → Frontend manifest + views + components
//         ├── config/
//         │   ├── constants.json
//         │   └── uiText.json
//         ├── views/
//         ├── components/
//         └── manifest.jsx      → UI entry point (module contract)
//
// DIST OUTPUT (dist-modules/<moduleId>/):
//   dist-modules/<moduleId>/
//     ├── manifest.js           → Compiled UI bundle
//     ├── constants.json        → Module metadata (from ui/config/)
//     └── api/                  → Copied from modules/<id>/api/
//         ├── config/
//         └── index.js
//
// USAGE:
//   node scripts/build-module.js <moduleId>
//   npm run build:module -- servicenow
//
// ZERO DOWNTIME: After building, the module appears in Module Manager → Available.
// Install → Enable → API routes loaded dynamically, UI manifest fetched via hot-drop.
// No platform rebuild. No server restart. No downtime.
//
// DEPENDENCIES:
//   - vite                    → Build toolchain
//   - vite.module.config.js   → Build configuration template
// ============================================================================

import { build } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Parse module ID from CLI args ─────────────────────────────────────────────
const moduleId = process.argv[2];

if (!moduleId) {
  console.error('[build-module] ERROR: No module ID provided.');
  console.error('  Usage: node scripts/build-module.js <moduleId>');
  console.error('  Example: node scripts/build-module.js servicenow');
  process.exit(1);
}

// ── Resolve source paths ────────────────────────────────────────────────────
// New layout: modules/<moduleId>/ui/ and modules/<moduleId>/api/
// Fallback: src/modules/<moduleId>/ (legacy layout)
const newLayoutSrc = path.join(ROOT, 'modules', moduleId);
const legacySrc = path.join(ROOT, 'src', 'modules', moduleId);

let moduleSrc, uiDir, apiDir, uiEntry, constantsSrc;

if (fs.existsSync(path.join(newLayoutSrc, 'ui', 'manifest.jsx'))) {
  // New modular layout: modules/<id>/ui/ + modules/<id>/api/
  moduleSrc = newLayoutSrc;
  uiDir = path.join(newLayoutSrc, 'ui');
  apiDir = path.join(newLayoutSrc, 'api');
  uiEntry = path.join(uiDir, 'manifest.jsx');
  constantsSrc = path.join(uiDir, 'config', 'constants.json');
  console.log(`[build-module] Using new layout: modules/${moduleId}/`);
} else if (fs.existsSync(legacySrc)) {
  // Legacy layout: src/modules/<id>/manifest.jsx + constants.json
  moduleSrc = legacySrc;
  uiDir = legacySrc;
  // Check for API in new modules/ location even with legacy UI
  apiDir = fs.existsSync(path.join(newLayoutSrc, 'api')) ? path.join(newLayoutSrc, 'api') : null;
  uiEntry = path.join(legacySrc, 'manifest.jsx');
  constantsSrc = path.join(legacySrc, 'constants.json');
  console.log(`[build-module] Using legacy UI layout: src/modules/${moduleId}/`);
  if (apiDir) console.log(`[build-module] API from new layout: modules/${moduleId}/api/`);
} else {
  console.error(`[build-module] ERROR: Module source not found.`);
  console.error(`  Checked: ${newLayoutSrc}`);
  console.error(`  Checked: ${legacySrc}`);
  process.exit(1);
}

const outDir = path.join(ROOT, 'api', 'dist-modules', moduleId);

console.log(`[build-module] Building module: ${moduleId}`);
console.log(`[build-module]   UI Entry:    ${uiEntry}`);
console.log(`[build-module]   API Dir:     ${apiDir || 'none (UI-only module)'}`);
console.log(`[build-module]   Output:      ${outDir}`);

// ── Validate UI entry point ──────────────────────────────────────────────────
if (!fs.existsSync(uiEntry)) {
  console.error(`[build-module] ERROR: manifest.jsx not found: ${uiEntry}`);
  process.exit(1);
}

// ── Helper: recursively copy a directory ─────────────────────────────────────
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ── Run Vite library-mode build (UI manifest) ────────────────────────────────
try {
  // Set env var for vite.module.config.js to pick up
  process.env.VITE_MODULE_ID = moduleId;
  process.env.VITE_MODULE_ENTRY = uiEntry;

  await build({
    configFile: path.join(ROOT, 'vite.module.config.js'),
    mode: 'production',
    define: {
      'process.env.VITE_MODULE_ID': JSON.stringify(moduleId),
    },
    envPrefix: 'VITE_',
  });

  console.log(`[build-module] ✓ UI build complete: dist-modules/${moduleId}/manifest.js`);

  // ── Copy constants.json for moduleScanner discovery ──────────────────────
  if (fs.existsSync(constantsSrc)) {
    fs.copyFileSync(constantsSrc, path.join(outDir, 'constants.json'));
    console.log(`[build-module] ✓ Copied: constants.json`);
  } else {
    console.warn(`[build-module] ⚠ No constants.json found — module won't be discoverable`);
  }

  // ── Copy API directory (if exists) ────────────────────────────────────────
  if (apiDir && fs.existsSync(apiDir)) {
    const apiOutDir = path.join(outDir, 'api');
    copyDirRecursive(apiDir, apiOutDir);
    console.log(`[build-module] ✓ Copied: api/ directory (${fs.readdirSync(apiDir).length} items)`);
  } else {
    console.log(`[build-module] ℹ No API directory — UI-only module`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('');
  console.log(`[build-module] ══════════════════════════════════════════════════`);
  console.log(`[build-module] SUCCESS — ${moduleId} is ready for deployment.`);
  console.log(`[build-module] ══════════════════════════════════════════════════`);
  console.log(`[build-module]   Output: dist-modules/${moduleId}/`);

  // List output files
  const listFiles = (dir, prefix = '') => {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) {
        console.log(`[build-module]     ${prefix}${item.name}/`);
        listFiles(path.join(dir, item.name), `${prefix}  `);
      } else {
        const size = fs.statSync(path.join(dir, item.name)).size;
        const sizeStr = size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`;
        console.log(`[build-module]     ${prefix}${item.name} (${sizeStr})`);
      }
    }
  };
  listFiles(outDir);

  console.log('');
  console.log(`[build-module] NEXT STEPS:`);
  console.log(`[build-module]   1. Open Module Manager in the UI`);
  console.log(`[build-module]   2. Go to "Available" tab → Click "Scan for Modules"`);
  console.log(`[build-module]   3. Click "Install" on ${moduleId}`);
  console.log(`[build-module]   4. Click "Enable" — API routes load dynamically, UI appears in nav`);
  console.log(`[build-module]   5. No server restart. No UI rebuild. Zero downtime.`);

} catch (err) {
  console.error(`[build-module] BUILD FAILED: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
}
