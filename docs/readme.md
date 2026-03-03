# PulseOps V2 — Developer Reference

## Quick Start URLs & Credentials

### Service URLs (Development)

> **Note**: All URLs and ports are centralized in `src/config/urls.json` and `api/src/config/urls.json`

| Service | URL | Notes |
|---------|-----|-------|
| **Frontend (Vite Dev)** | `http://localhost:1001` | React SPA — auto-reloads on save |
| **Backend API** | `http://localhost:4001/api` | Express REST API |
| **Swagger UI** | `http://localhost:4001/api-docs` | Interactive API documentation |
| **Health Check** | `http://localhost:4001/api/health` | Liveness probe |
| **Readiness Check** | `http://localhost:4001/api/health/readiness` | K8s readiness probe |
| **PgAdmin** | `http://localhost:5050` | PostgreSQL admin UI (if running via Docker) |

### Default Credentials

| Service | Username / Email | Password | Notes |
|---------|-----------------|----------|-------|
| **PulseOps Login** | `admin@test.com` | `Infosys@123` | Default admin (JSON file auth) |
| **PostgreSQL** | `postgres` | `Infosys@123` | Local dev database |
| **PgAdmin** | `admin@pulseops.com` | `admin` | Docker PgAdmin (if configured) |

### Database Configuration (Development)

| Parameter | Value |
|-----------|-------|
| **Host** | `localhost` |
| **Port** | `5432` |
| **Database** | `pulseops_v2` |
| **Schema** | `pulseops` |
| **User** | `postgres` |
| **SSL** | `false` |
| **Pool Size** | `10` |

---

## API Endpoint Reference

### Health & Status

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Liveness check |
| GET | `/api/health/readiness` | No | K8s readiness probe |

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login — returns HttpOnly cookie |
| POST | `/api/auth/logout` | Cookie | Logout — clears cookie |
| POST | `/api/auth/refresh` | Cookie | Refresh access token |
| GET | `/api/auth/me` | Cookie | Get current user |
| POST | `/api/auth/config` | Cookie | Switch auth provider |

### Database Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/database/test-connection` | Cookie | Test PostgreSQL connection |
| POST | `/api/database/save-config` | Cookie | Save database config |
| GET | `/api/database/save-config` | Cookie | Get current database config |
| GET | `/api/database/schema-status` | Cookie | Check schema/data status |
| POST | `/api/database/create-database` | Cookie | Create database |
| DELETE | `/api/database/delete-database` | Cookie | Delete database |
| POST | `/api/database/create-schema` | Cookie | Initialize schema + tables |
| POST | `/api/database/load-default-data` | Cookie | Seed default admin + config |
| DELETE | `/api/database/load-default-data` | Cookie | Clean default data |
| POST | `/api/database/wipe` | Cookie | Drop all tables |
| GET | `/api/database/stats` | Cookie | Database statistics |

### Modules

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/modules` | Cookie | List enabled modules |
| GET | `/api/modules/available` | Cookie | List all available modules |
| GET | `/api/modules/bundle/:id/manifest.js` | No | Hot-drop module bundle |

### Configuration

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/config` | Cookie | List system config |
| POST | `/api/config` | Cookie | Save system config |

### Logs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/logs/stats` | Cookie | Log statistics |

---

## Running Locally

```bash
# Terminal 1 — Backend API
cd api
npm install
npm run dev          # Starts on port 4001

# Terminal 2 — Frontend
npm install
npm run dev          # Starts on port 1001 (Vite)
```

## Production Build

```bash
# Frontend
npm run build        # Output: dist/

# Backend
cd api
npm start            # NODE_ENV=production
```

## Docker (Optional)

```bash
# PostgreSQL + PgAdmin
docker-compose up -d db pgadmin

# Full stack
docker-compose up -d
```

---

## Architecture Summary

| Layer | Technology | Port |
|-------|-----------|------|
| **Frontend** | React 19 + Vite 7 + TailwindCSS 4 | 1001 |
| **Backend** | Node.js + Express | 4001 |
| **Database** | PostgreSQL 16 | 5432 |
| **Auth** | JWT via HttpOnly cookies | — |
| **Module System** | ES Module hot-drop (zero-downtime) | — |
| **API Docs** | Swagger / OpenAPI 3.0 | 4001 |

### Key Architecture Decisions

- **HttpOnly Cookie Auth** — JWT is never exposed to JavaScript. Browser sends cookies automatically via `credentials: 'include'`.
- **Zero-Downtime Modules** — Add-on modules are loaded via dynamic `import()` with cache-busting URLs. No rebuild needed.
- **Zero Hardcoded Text** — All UI labels, messages, and errors are externalized to JSON config files (`uiElementsText.json`, `UIMessages.json`, `UIErrors.json`).
- **Core vs Modules** — Admin, Auth, Logs, and Database are core platform features (not modules). Only business modules use the hot-drop system.
