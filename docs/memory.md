# PulseOps V2 — Development Memory

> **Auto-updated by Cascade after each work session.**
> Last updated: 2026-03-01

---

## 1. Project Overview

PulseOps V2 is an enterprise modular operations platform with a plug-and-play module architecture and Kubernetes-ready stateless deployment. The platform consists of:

- **Frontend (UI)**: React + Vite + TailwindCSS at `src/`
- **Backend (API)**: Express + pg (node-postgres) at `api/`
- **Hot-Drop Modules**: Built independently → dropped into `dist-modules/` → discovered at runtime

### Key URLs
- UI Dev Server: `http://localhost:5173`
- API Server: `http://localhost:4001`
- Swagger: `http://localhost:4001/api-docs`
- All URLs defined in: `src/config/urls.json`

### Default Credentials
- Email: `admin@test.com`
- Password: `Infosys@123`

---

## 2. Architecture

### Module Types
| Type | Example | Bundled? | Loaded How | Can Remove? |
|------|---------|----------|------------|-------------|
| **Core** | Admin (`platform_admin`), Auth (`auth`) | Yes, statically imported | `import` at build time | No |
| **Add-on** | Custom modules | No | Dynamic `import()` from URL at runtime | Yes |

### Folder Structure (V2 Key Difference from V1)
- `src/config/` — Global frontend config (urls.json, globalText.json, app.json). **NOT inside shared/**.
- `src/shared/` — Design system components, services, hooks. NO config files.
- `src/core/` — App bootstrap, platform dashboard, auth.
- `src/modules/` — Self-contained pluggable modules.
- `api/` — Stateless Express backend.
- `dist-modules/` — Compiled hot-drop module bundles.

### Import Aliases (jsconfig.json)
- `@config/*` → `src/config/*`
- `@core/*` → `src/core/*`
- `@modules/*` → `src/modules/*`
- `@shared/*` → `src/shared/*`
- `@shared` → `src/shared/index.js` (barrel export)

---

## 3. Completed Tasks

| # | Task | Status |
|---|------|--------|
| T1 | Repository scaffolding (frontend + backend + testing + rules) | DONE |

---

## 4. Important Patterns

### No Hardcoded Strings
- UI labels → `uiText.json` (per module) or `globalText.json` (platform-wide)
- API URLs → `urls.json`
- Module metadata → `constants.json`

### CrudActionModal Pattern
- All destructive CRUD uses `CrudActionModal` from `@shared`
- 3 phases: Confirm → Progress → Summary
- UI text under `crud` key in `uiText.json`

### Module Manifest Contract
- Required fields: `id`, `name`, `version`, `description`, `icon`, `defaultView`, `navItems`, `getViews`
- Required navItems: `dashboard`, `config`, `reports`
- Metadata from `constants.json`, UI from `manifest.jsx`
- `moduleDetails` object required: features, author, license, dependencies

---

## 5. Tech Stack (Installed)

### Frontend
- React 19.2, ReactDOM 19.2
- Vite 7.3 (dev server + build)
- TailwindCSS 4 (via @tailwindcss/postcss + autoprefixer)
- react-router-dom (URL-driven routing)
- lucide-react (icon library)

### Backend (api/)
- Express 4.21
- cors 2.8, helmet 8.0, cookie-parser 1.4
- nodemon 3.1 (dev)

### Testing
- Vitest (unit tests, jsdom env)
- @testing-library/react + @testing-library/jest-dom
- Storybook 8 (@storybook/react, @storybook/react-vite, @storybook/addon-essentials)

---

## 6. Scaffolded File Inventory

### Root
- `.windsurfrules` — Enterprise coding standards (ported from V1, updated for V2)
- `.gitignore` — Node/React ignores
- `.env.example` — Env var template
- `jsconfig.json` — Path aliases (@config, @core, @modules, @shared)
- `vite.config.js` — Vite + aliases + proxy + vitest config
- `tailwind.config.js` — Design tokens mapping CSS vars to utilities
- `postcss.config.js` — @tailwindcss/postcss + autoprefixer
- `index.html` — Entry HTML
- `scripts/build-module.js` — Hot-drop module build script (placeholder)

### Frontend (src/)
- `main.jsx` — App bootstrap
- `index.css` — Design tokens (CSS variables) + Tailwind import
- `config/urls.json` — All API URLs
- `config/globalText.json` — Platform-wide UI strings
- `config/app.json` — App metadata + default credentials
- `core/App.jsx` — Root component with BrowserRouter
- `core/PlatformDashboard.jsx` — Main shell with URL params
- `modules/moduleRegistry.js` — Static + dynamic module loading
- `modules/_template/` — Full module template (manifest, constants, uiText, 3 views)
- `shared/index.js` — Barrel export
- `shared/components/Button.jsx` — First design system component
- `shared/services/apiClient.js` — HTTP client with auth support
- `shared/test/setup.js` — Vitest global setup

### Backend (api/src/)
- `server.js` — Entry point with graceful shutdown
- `app.js` — Express factory with enterprise middleware chain
- `config/index.js` — 12-factor config loader
- `config/app.json` — Default config values
- `core/middleware/auth.js` — Dual-auth middleware (Bearer + cookie)
- `core/middleware/security.js` — Input sanitization
- `core/routes/index.js` — Route registration with health endpoints

### Testing
- `src/shared/components/Button.test.jsx` — Sample Vitest test
- `src/shared/components/Button.stories.jsx` — Sample Storybook story
- `.storybook/main.js` — Storybook config
- `.storybook/preview.js` — Imports global CSS for stories

---

## 7. Known Issues / Notes

- V2 uses `src/config/` for global config (V1 used `src/shared/config/`)
- V2 uses `globalText.json` instead of V1's `src/shared/config/uiText.json`
- Vite dev server on port 5173
- API on port 4001
- Node.js 20.18 shows engine warnings for Vite 7 (needs 20.19+) but builds work
- Storybook 10 requires Node 20.19+; using Storybook 8 with `--legacy-peer-deps`
- Frontend build verified: `vite build` succeeds (230KB JS, 13KB CSS)
- API verified: Express app loads but port 4001 blocked if V1 API running
