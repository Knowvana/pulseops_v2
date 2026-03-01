// ============================================================================
// Module Registry — PulseOps V2
//
// PURPOSE: Central registry for all platform modules. Manages static
// (core) and dynamic (hot-dropped) module manifests.
//
// ARCHITECTURE:
//   - Core modules are statically imported at build time.
//   - Add-on modules are dynamically imported from API URLs at runtime.
//   - Provides loadModuleManifest() for the PlatformDashboard.
//
// DEPENDENCIES:
//   - @config/urls.json → API endpoints for module bundles
// ============================================================================

// --- Static Core Module Imports ---
// Uncomment when core modules are created:
// import adminManifest from '@modules/admin/manifest.jsx';
// import authManifest from '@modules/auth/manifest.jsx';

const STATIC_MANIFESTS = {
  // platform_admin: adminManifest,
  // auth: authManifest,
};

// --- Dynamic Module Cache ---
const _dynamicManifests = {};

/**
 * Load a module manifest by ID.
 * 1. Check dynamic cache
 * 2. Check static core manifests
 * 3. Try hot-drop URL import from API
 *
 * @param {string} moduleId - The module identifier
 * @param {string} [version] - Module version for cache busting
 * @returns {Promise<Object|null>} The module manifest or null
 */
export async function loadModuleManifest(moduleId, version = '1.0.0') {
  // 1. Already cached
  if (_dynamicManifests[moduleId]) {
    return _dynamicManifests[moduleId];
  }

  // 2. Core module (statically imported)
  if (STATIC_MANIFESTS[moduleId]) {
    return STATIC_MANIFESTS[moduleId];
  }

  // 3. Hot-drop: dynamic import from API
  try {
    const hotDropUrl = `/api/modules/bundle/${moduleId}/manifest.js?v=${version}`;
    const mod = await import(/* @vite-ignore */ hotDropUrl);
    const manifest = mod.default || mod;
    _dynamicManifests[moduleId] = manifest;
    return manifest;
  } catch (err) {
    console.error(`[ModuleRegistry] Failed to load module '${moduleId}':`, err.message);
    return null;
  }
}

/**
 * Register a dynamically loaded manifest into the cache.
 * @param {string} moduleId
 * @param {Object} manifest
 */
export function registerDynamicManifest(moduleId, manifest) {
  _dynamicManifests[moduleId] = manifest;
}

/**
 * Get all statically imported core manifests.
 * @returns {Object} Map of moduleId → manifest
 */
export function getStaticManifests() {
  return { ...STATIC_MANIFESTS };
}

/**
 * Get all dynamically loaded manifests.
 * @returns {Object} Map of moduleId → manifest
 */
export function getDynamicManifests() {
  return { ..._dynamicManifests };
}
