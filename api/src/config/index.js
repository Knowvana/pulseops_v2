// ============================================================================
// Config Loader — PulseOps V2 API
//
// PURPOSE: Merges environment variables with JSON defaults from app.json.
// Follows 12-factor app principles — env vars take precedence.
//
// USAGE: import { config } from './config/index.js';
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load JSON defaults
const appJsonPath = path.join(__dirname, 'app.json');
const defaults = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));

export const config = {
  // Server
  port: parseInt(process.env.PORT || defaults.port, 10),
  nodeEnv: process.env.NODE_ENV || defaults.nodeEnv,
  frontendOrigin: process.env.FRONTEND_ORIGIN || defaults.frontendOrigin,

  // Database
  db: {
    host: process.env.DB_HOST || defaults.database.host,
    port: parseInt(process.env.DB_PORT || defaults.database.port, 10),
    name: process.env.DB_NAME || defaults.database.name,
    user: process.env.DB_USER || defaults.database.user,
    password: process.env.DB_PASSWORD || defaults.database.password,
    schema: process.env.DB_SCHEMA || defaults.database.schema,
    poolSize: parseInt(process.env.DB_POOL_SIZE || defaults.database.poolSize, 10),
  },

  // Auth
  auth: {
    jwtSecret: process.env.JWT_SECRET || defaults.auth.jwtSecret,
    accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || defaults.auth.accessTokenExpiry,
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || defaults.auth.refreshTokenExpiry,
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || defaults.auth.bcryptRounds, 10),
  },

  // CDN
  cdnBaseUrl: process.env.CDN_BASE_URL || defaults.cdnBaseUrl,
};
