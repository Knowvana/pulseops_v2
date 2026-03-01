// ============================================================================
// Build Module Script — PulseOps V2
//
// PURPOSE: CLI script to build individual add-on modules as standalone
// ES module bundles for hot-dropping.
//
// USAGE:
//   node scripts/build-module.js <moduleId>
//   npm run build:module <moduleId>
//
// OUTPUT: dist-modules/<moduleId>/manifest.js + constants.json
// ============================================================================
import { build } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const moduleId = process.argv[2];

if (!moduleId) {
  console.error('Usage: node scripts/build-module.js <moduleId>');
  process.exit(1);
}

const moduleSrc = path.join(ROOT, 'src', 'modules', moduleId);
const outDir = path.join(ROOT, 'dist-modules', moduleId);

if (!fs.existsSync(moduleSrc)) {
  console.error(`Module source not found: ${moduleSrc}`);
  process.exit(1);
}

console.log(`Building module: ${moduleId}`);
console.log(`  Source: ${moduleSrc}`);
console.log(`  Output: ${outDir}`);

// TODO: Implement Vite library-mode build
// This will use vite.module.config.js pattern from V1
console.log('Build script placeholder — implement vite.module.config.js for production builds.');
