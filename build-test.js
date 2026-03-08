#!/usr/bin/env node
import { build } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const moduleId = 'servicenow';

const newLayoutSrc = path.join(ROOT, 'modules', moduleId);
const legacySrc = path.join(ROOT, 'src', 'modules', moduleId);

let uiEntry;
if (fs.existsSync(path.join(newLayoutSrc, 'ui', 'manifest.jsx'))) {
  uiEntry = path.join(newLayoutSrc, 'ui', 'manifest.jsx');
  console.log('Using new layout');
} else if (fs.existsSync(legacySrc)) {
  uiEntry = path.join(legacySrc, 'manifest.jsx');
  console.log('Using legacy layout');
} else {
  console.error('Module source not found');
  process.exit(1);
}

console.log('Entry point:', uiEntry);
console.log('Entry exists:', fs.existsSync(uiEntry));

// Try to build
try {
  process.env.VITE_MODULE_ID = moduleId;
  process.env.VITE_MODULE_ENTRY = uiEntry;

  await build({
    configFile: path.join(ROOT, 'vite.module.config.js'),
    mode: 'production',
  });

  console.log('Build succeeded');
  process.exit(0);
} catch (err) {
  console.error('Build failed:', err.message);
  console.error(err.stack);
  process.exit(1);
}
