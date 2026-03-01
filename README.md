# PulseOps V2

Enterprise modular operations platform with plug-and-play module architecture and Kubernetes-ready stateless deployment.

## Architecture

- **Microkernel + Micro-Frontend** — Core modules statically bundled, add-on modules hot-dropped at runtime
- **Zero-Downtime Hot-Dropping** — Build, drop, discover, load — no restart required
- **K8s-Ready** — Stateless API, horizontal scaling, health/readiness probes

## Local Development URLs

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **API** | http://localhost:4001 |
| **Swagger** | http://localhost:4001/api-docs |

## Default Local Credentials

| Field | Value |
|-------|-------|
| **Email** | `admin@test.com` |
| **Password** | `Infosys@123` |

## Quick Start

```bash
# Install frontend dependencies
npm install

# Install API dependencies
cd api && npm install && cd ..

# Start both (frontend + API)
npm run dev

# Or start separately
npm run dev:ui    # Frontend on :5173
npm run dev:api   # API on :4001
```

## Project Structure

```
pulseops_v2/
├── api/              # Backend (Node.js + Express)
│   └── src/
│       ├── config/   # Backend config
│       ├── core/     # Middleware, routes, database
│       └── shared/   # Logger, utilities
├── src/              # Frontend (React + Vite + Tailwind)
│   ├── config/       # Global frontend config (urls, text, app)
│   ├── core/         # App bootstrap, platform dashboard
│   ├── modules/      # Pluggable modules
│   └── shared/       # Design system, services, hooks
├── dist-modules/     # Compiled hot-drop modules
├── docs/             # Architecture docs
└── scripts/          # Build scripts
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, TailwindCSS, Lucide Icons |
| **Backend** | Node.js, Express 4, PostgreSQL (pg), Winston |
| **Security** | Helmet.js, JWT (HttpOnly cookies + Bearer), bcrypt, rate limiting |
| **Testing** | Vitest, React Testing Library, Storybook |
| **Deployment** | Docker, Kubernetes |
