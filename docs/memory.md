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

## 5. Known Issues / Notes

- V2 uses `src/config/` for global config (V1 used `src/shared/config/`)
- Vite dev server on port 5173 (V1 was 3000)
- API on port 4001
