# PulseOps V2 — Development Memory

> **Auto-updated by Cascade after each work session.**
> Last updated: 2026-03-02

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

### Core System vs Modules
| Type | Example | Location | Loaded How | Can Remove? |
|------|---------|----------|------------|-------------|
| **Core System** | Admin (Dashboard, ModuleManager, LogManager, Settings) | `src/core/views/` | Hardcoded in PlatformDashboard | No |
| **Add-on Module** | Custom hot-drop modules | `src/modules/<id>/` or `dist-modules/<id>/` | Dynamic `import()` from URL at runtime | Yes |

### Folder Structure (V2 Key Difference from V1)
- `src/config/` — Global frontend config (urls.json, globalText.json, app.json). **NOT inside shared/**.
- `src/core/` — App bootstrap (App.jsx), PlatformDashboard (single orchestrator for core + modules).
- `src/core/views/` — Native core Admin views (AdminDashboard, ModuleManager, LogManager, Settings). **Admin is NOT a module — it is core system.**
- `src/layouts/` — Global layout components (AppShell, TopMenu, LeftSideNavBar, RightLogsView, MainContent). **Elevated to top-level, NOT in shared/**.
- `src/shared/` — Design system components, services, hooks. NO config files, NO layouts.
- `src/modules/` — Self-contained pluggable add-on modules ONLY. **No core/admin module here.**
- `api/` — Stateless Express backend.
- `dist-modules/` — Compiled hot-drop module bundles.

### Import Aliases (jsconfig.json)
- `@config/*` → `src/config/*`
- `@core/*` → `src/core/*`
- `@modules/*` → `src/modules/*`
- `@shared/*` → `src/shared/*`
- `@shared` → `src/shared/index.js` (barrel export)
- `@layouts/*` → `src/layouts/*`
- `@layouts` → `src/layouts/index.js` (barrel export)

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
| T8 | App Shell Architecture (TopMenu, LeftSideNavBar, RightLogsView, MainContent, AppShell) | DONE |
| T9 | Native Core Views (AdminDashboard, ModuleManager, LogManager, Settings) | DONE |
| T10 | Settings UI with 5 ConfigLayout tabs (DB Config, DB Objects, Log Settings, Log Config, Auth) | DONE |
| T11 | App.jsx rewrite with core routes + dynamic module catch-all inside AppShell | DONE |
| T12 | PlatformDashboard refactor to pure dynamic module orchestrator | DONE |
| T13 | @layouts alias added to .windsurfrules, jsconfig.json, vite.config.js | DONE |
| T14 | globalText.json expanded with coreNav, coreViews, topNav, sideNav, rightPanel sections | DONE |
| T15 | CSS animations (fade-in, scale-in, slide-down) + scrollbar-hide utility | DONE |
| T16 | Architecture correction: Admin is core system, NOT a module. Deleted src/modules/admin/ | DONE |
| T17 | TopMenu rewrite to V1 design: white bg, gradient accent line, dynamic module tabs | DONE |
| T18 | LeftSideNavBar rewrite to V1 design: header+collapse at top, gradient active state | DONE |
| T19 | AppShell rewrite: module-driven props-only, matches V1 AppShell exactly | DONE |
| T20 | PlatformDashboard: single orchestrator — core Admin views + dynamic module views | DONE |
| T21 | App.jsx: thin auth wrapper, URL-driven PlatformDashboard orchestrator | DONE |
| T22 | moduleRegistry.js: dynamic-only (no core modules), V1-style getAllManifests API | DONE |

## Recent Updates (2026-03-02 — Session 2)
- **Architecture Correction**: Admin is a CORE SYSTEM feature, NOT a module. Deleted `src/modules/admin/`
- **TopMenu V1 Design**: White background, gradient accent line, module tabs with icons, V1-matching user menu
- **Single Dashboard**: PlatformDashboard IS the dashboard — no separate AdminDashboard route
- **PlatformDashboard Orchestrator**: Single orchestrator handles BOTH core Admin views AND dynamic module views
- **Admin Tab**: Always first in TopMenu (hardcoded), its views defined in `CORE_ADMIN` constant in PlatformDashboard
- **Dynamic Module Tabs**: Appear after Admin when modules are enabled from Module Manager (hot-drop, zero downtime)
- **App.jsx Simplified**: Thin auth wrapper → BrowserRouter → PlatformDashboard
- **URL Pattern**: `/:moduleId/:viewId` for all navigation (core Admin = `/platform_admin/dashboard`)
- **LeftSideNavBar V1 Design**: Header with title + collapse toggle at top, gradient active state, badge support
- **AppShell V1 Design**: Module-driven props-only wrapper (TopMenu + SideNav + Main + RightPanel)
- **moduleRegistry.js**: Dynamic-only — no static core modules (Admin is core system, not a module)
- **Build Verified**: `vite build` succeeds — 311KB JS, 41KB CSS

### Previous (2026-03-02 — Session 1)
- App Shell Architecture built (layouts elevated to src/layouts/)
- Native Core Views created in src/core/views/
- Settings UI with 5 ConfigLayout tabs
- CSS animations and scrollbar utilities added

### Previous (2026-03-01)
- **Created Button.jsx**: Reusable button component with 5 variants (primary, secondary, danger, success, ghost)
- **LoginForm gradient theme**: All buttons use `from-brand-500 to-cyan-500` gradient matching LoginForm aesthetic
- **ButtonShowcase.jsx**: Comprehensive visual testing component showing all button variants, sizes, and states
- **Theming analysis**: Verified perfect alignment between index.css and tailwind.config.js color tokens

---

## 4. Important Patterns

### Design System Components
- **Button.jsx**: Primary variant uses gradient `from-brand-500 to-cyan-500` with teal theme colors
- Brand colors: teal (#14b8a6 for brand-500)
- Button styling matches login button: `transition-all`, `rounded-xl`, `font-bold`, shadow effects

### App Shell Layout Pattern (V1-matching)
- **AppShell.jsx** — Module-driven props-only wrapper: TopMenu + SideNav + Main + RightPanel
- **TopMenu.jsx** — White bg, gradient accent line, dynamic module tabs with icons, V1-style user dropdown, monitor toggle
- **LeftSideNavBar.jsx** — V1 SideNav: header with title + collapse toggle, gradient active state, badge support
- **RightLogsView.jsx** — Slide-out right panel for system logs and API calls (tabs + filter)
- All layout components are in `src/layouts/` and imported via `@layouts`

### Core Architecture (Admin is NOT a module)
- **Admin** is a core SYSTEM feature defined in `CORE_ADMIN` constant inside PlatformDashboard
- Admin views: Dashboard, ModuleManager, LogManager, Settings (all in `src/core/views/`)
- Admin tab is always first in TopMenu — hardcoded, cannot be disabled
- **Dynamic modules** appear as additional tabs after Admin when enabled
- **URL pattern**: `/:moduleId/:viewId` (e.g., `/platform_admin/dashboard`, `/auth/dashboard`)
- **PlatformDashboard** is the SINGLE orchestrator for BOTH core Admin views AND dynamic module views
- Authentication uses JSON file-based auth (app.json defaultAdmin) as default

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
- `index.css` — Design tokens (CSS variables) + Tailwind import + animations
- `config/urls.json` — All API URLs
- `config/globalText.json` — Platform-wide UI strings (coreNav, coreViews, topNav, sideNav, rightPanel, settings)
- `config/app.json` — App metadata + default credentials
- `core/App.jsx` — Thin auth wrapper + BrowserRouter → PlatformDashboard as single orchestrator
- `core/PlatformDashboard.jsx` — Single orchestrator for core Admin views + dynamic module views inside AppShell
- `core/views/AdminDashboard.jsx` — Native core dashboard view
- `core/views/ModuleManager.jsx` — Native module management view
- `core/views/LogManager.jsx` — Native system logs view
- `core/views/Settings.jsx` — Native settings view (ConfigLayout with 5 tabs: DB Config, DB Objects, Log Settings, Log Config, Auth)
- `layouts/AppShell.jsx` — Master layout wrapper (TopMenu + SideNav + MainContent + RightPanel)
- `layouts/TopMenu.jsx` — Global top navigation bar
- `layouts/LeftSideNavBar.jsx` — Collapsible left sidebar navigation
- `layouts/RightLogsView.jsx` — Right slide-out panel for logs and API calls
- `layouts/MainContent.jsx` — Scrollable main content area
- `layouts/index.js` — Layout barrel export
- `modules/moduleRegistry.js` — Dynamic-only module loading (no core modules, Admin is core system)
- `modules/_template/` — Full module template (manifest, constants, uiText, 3 views)
- `shared/index.js` — Barrel export
- `shared/components/Button.jsx` — Button with 5 variants
- `shared/components/LoginForm.jsx` — Login form with social auth placeholders
- `shared/components/ConfigLayout.jsx` — Vertical tabbed settings panel
- `shared/components/TestConnection.jsx` — Connection test form with status
- `shared/components/ConnectionStatus.jsx` — Connection status display
- `shared/components/DatabaseManager.jsx` — DB schema/data management
- `shared/components/LoggingConfig.jsx` — Logging configuration panel
- `shared/components/ConfirmationModal.jsx` — 3-phase CRUD modal
- `shared/components/StatsCount.jsx` — Horizontal count statistics
- `shared/services/apiClient.js` — HTTP client with auth support

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
- Frontend build verified: `vite build` succeeds (311KB JS, 41KB CSS)
- API verified: Express app loads but port 4001 blocked if V1 API running
- Admin is core system, NOT a module — `src/modules/admin/` was deleted
