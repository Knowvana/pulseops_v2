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
| T2 | Update design tokens to teal theme (brand colors) | DONE |
| T3 | Update Button component to match login button styling | DONE |
| T4 | Fix LoginForm button gradient rendering | DONE |
| T5 | Create reusable Button component with LoginForm gradient theme | DONE |
| T6 | Create ButtonShowcase for visual testing | DONE |
| T7 | Theming consistency analysis and documentation | DONE |

## Recent Updates (2026-03-01)
- **Created Button.jsx**: Reusable button component with 5 variants (primary, secondary, danger, success, ghost)
- **LoginForm gradient theme**: All buttons use `from-brand-500 to-cyan-500` gradient matching LoginForm aesthetic
- **ButtonShowcase.jsx**: Comprehensive visual testing component showing all button variants, sizes, and states
- **Theming analysis**: Verified perfect alignment between index.css and tailwind.config.js color tokens
- **Documentation**: Created THEMING_ANALYSIS.md with complete design system guidelines
- **Visual verification**: Dev server running on port 5177 with ButtonShowcase rendered

---

## 4. Important Patterns

### Design System Components
- **Button.jsx**: Primary variant uses gradient `from-brand-500 to-cyan-500` with teal theme colors
- Brand colors: teal (#14b8a6 for brand-500)
- Button styling matches login button: `transition-all`, `rounded-xl`, `font-bold`, shadow effects

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
- Removed from V2 scaffold (no test harness tracked in repo at this stage)

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
- Removed from V2 scaffold (no Storybook / Vitest artifacts tracked)

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
