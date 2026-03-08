# Module Template — PulseOps V2

This is the default module template. Copy this entire `_template/` folder and rename it to create a new module.

## Folder Structure

```
modules/<moduleId>/
├── api/                              ← Backend (Node.js, copied to dist-modules/)
│   ├── config/                       ← Module-specific JSON configs
│   │   └── <moduleId>_connection.json
│   ├── index.js                      ← API entry point (exports router + lifecycle hooks)
│   └── README.md
│
├── ui/                               ← Frontend (React, built via Vite into dist-modules/)
│   ├── config/
│   │   ├── constants.json            ← Module metadata (id, name, version, description)
│   │   └── uiText.json              ← All UI labels and text
│   ├── views/                        ← Full-page view components
│   │   └── Dashboard.jsx
│   ├── components/                   ← Reusable sub-components
│   │   └── config/                   ← Config tab components
│   │       └── ConnectionTab.jsx
│   └── manifest.jsx                  ← UI entry point (module contract)
│
└── README.md                         ← This file
```

## Build & Deploy

```bash
# Build the module (UI bundle + API copy)
npm run build:module <moduleId>

# Output goes to dist-modules/<moduleId>/
#   manifest.js       ← Compiled UI bundle
#   constants.json    ← Module metadata
#   api/              ← API routes + config (copied as-is)
```

## Enable Flow (Zero Downtime)

1. Build: `npm run build:module <moduleId>`
2. Open Module Manager in the UI
3. Go to **Available** tab → Click **Scan for Modules**
4. Click **Install** on your module
5. Click **Enable** — API routes load dynamically, UI appears in nav
6. No server restart. No UI rebuild. Zero downtime.

## Module Contract

Your `manifest.jsx` must export an object with:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique module identifier |
| `name` | string | ✅ | Display name |
| `shortName` | string | ✅ | Short name for tabs |
| `version` | string | ✅ | Semantic version |
| `description` | string | ✅ | Module description |
| `icon` | LucideIcon | ✅ | Lucide icon component |
| `navItems` | array | ✅ | Sidebar navigation items |
| `getViews()` | function | ✅ | Returns { viewId: Component } map |
| `getConfigTabs()` | function | optional | Returns config tab definitions |

### navItems must include:
- `dashboard` — Main module view
- `config` — Configuration view

## API Entry Point

Your `api/index.js` must export:

```js
export default router;           // Express Router
export { router };                // Named export alias
export async function onEnable()  {} // Called when module is enabled
export async function onDisable() {} // Called when module is disabled
```

The router is mounted at `/api/<moduleId>` automatically.
