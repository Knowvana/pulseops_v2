// ============================================================================
// Config Loader — PulseOps V2 API
//
// PURPOSE: Merges environment variables with JSON defaults from app.json
// and DatabaseConfig.json. Follows 12-factor app principles — env vars
// take precedence over JSON file values.
//
// CONFIG FILES LOADED:
//   - app.json           → Server, auth, CDN settings
//   - DatabaseConfig.json → Database connection settings (separate for CRUD)
//
// USAGE: import { config } from './config/index.js';
//
// ARCHITECTURE: This file is the SINGLE source of truth for all runtime
// configuration. Modules and middleware import from here — never from
// individual JSON files directly (except loadJson utility for messages).
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load JSON defaults
const appJsonPath = path.join(__dirname, 'app.json');
const dbJsonPath = path.join(__dirname, 'DatabaseConfig.json');
const defaults = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
const dbDefaults = JSON.parse(fs.readFileSync(dbJsonPath, 'utf-8'));

export const config = {
  // Server
  port: parseInt(process.env.PORT || defaults.port, 10),
  nodeEnv: process.env.NODE_ENV || defaults.nodeEnv,
  frontendOrigin: process.env.FRONTEND_ORIGIN || defaults.frontendOrigin,
  apiPrefix: process.env.API_PREFIX || '/api',

  // Database (from DatabaseConfig.json, overridable by env vars)
  db: {
    host: process.env.DB_HOST || dbDefaults.host,
    port: parseInt(process.env.DB_PORT || dbDefaults.port, 10),
    name: process.env.DB_NAME || dbDefaults.database,
    user: process.env.DB_USER || dbDefaults.user,
    password: process.env.DB_PASSWORD || dbDefaults.password,
    schema: process.env.DB_SCHEMA || dbDefaults.schema,
    ssl: process.env.DB_SSL === 'true' || dbDefaults.ssl || false,
    poolSize: parseInt(process.env.DB_POOL_SIZE || dbDefaults.poolSize, 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || dbDefaults.idleTimeoutMillis, 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT || dbDefaults.connectionTimeoutMillis, 10),
  },

  // Auth
  auth: {
    jwtSecret: process.env.JWT_SECRET || defaults.auth.jwtSecret,
    accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || defaults.auth.accessTokenExpiry,
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || defaults.auth.refreshTokenExpiry,
    refreshSecret: process.env.REFRESH_SECRET || (defaults.auth.jwtSecret + '_refresh'),
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || defaults.auth.bcryptRounds, 10),
    jwtExpiresInSeconds: parseInt(process.env.JWT_EXPIRES_IN_SECONDS || defaults.auth.jwtExpiresInSeconds || 86400, 10),
    defaultPassword: process.env.DEFAULT_PASSWORD || 'Infosys@123',
  },

  // CORS
  cors: {
    origin: process.env.FRONTEND_ORIGIN || defaults.frontendOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  // CDN
  cdnBaseUrl: process.env.CDN_BASE_URL || defaults.cdnBaseUrl,
};
