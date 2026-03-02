// ============================================================================
// Auth Routes — PulseOps V2 API
//
// PURPOSE: Authentication endpoints with multi-provider support.
// The active provider (json_file | database | social) determines how login
// is validated. Provider config is stored in auth-provider.json and mirrored
// to system_config table when DB is available.
//
// ENDPOINTS (Public):
//   POST /auth/login      — Authenticate with email/password → JWT tokens
//   GET  /auth/config     — Get current auth provider configuration
//
// ENDPOINTS (Protected — JWT required):
//   POST /auth/refresh    — Refresh an expired access token
//   POST /auth/logout     — Logout (clear cookies + client discards token)
//   GET  /auth/me         — Get current authenticated user profile
//   POST /auth/config     — Save auth provider (super_admin only)
//
// PROVIDER ROUTING:
//   json_file  → validates against api/src/config/DefaultAdminUser.json
//   database   → validates against pulseops.system_users in PostgreSQL
//
// SECURITY:
//   - Passwords compared with bcrypt (database provider)
//   - Plaintext match (json_file provider — dev/bootstrap only)
//   - HttpOnly cookies set on login for frontend security
//   - Bearer tokens also returned for Swagger/API tool usage
//   - Auth rate limiter applied at mount point in app.js
//
// DEPENDENCIES:
//   - ../middleware/auth.js → JWT, bcrypt, authenticate, requireRole
//   - ../database/databaseService.js → DB user lookup
//   - ../../config/index.js → schema, auth config
//   - ../../shared/loadJson.js → messages, errors, loadJson, saveJson
//   - ../../shared/logger.js → structured logging
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  comparePassword,
  hashPassword,
  authenticate,
  requireRole,
} from '#core/middleware/auth.js';
import DatabaseService from '#core/database/databaseService.js';
import { config } from '#config';
import { messages, errors, loadJson, saveJson } from '#shared/loadJson.js';
import { logger } from '#shared/logger.js';

const router = Router();
const schema = config.db.schema || 'pulseops';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PROVIDER_FILE = 'auth-provider.json';
const USERS_FILE = 'DefaultAdminUser.json';

// ── Auth Provider Helpers ────────────────────────────────────────────────────

/**
 * Read auth provider from DB first, fall back to auth-provider.json.
 * @returns {Promise<string>} 'json_file' | 'database' | 'social'
 */
async function getAuthProvider() {
  try {
    const result = await DatabaseService.query(
      `SELECT value FROM ${schema}.system_config WHERE key = 'auth_provider' LIMIT 1`
    );
    if (result.rows[0]?.value?.provider) {
      return result.rows[0].value.provider;
    }
  } catch {
    // DB not available — fall back to file
  }
  try {
    const fileConfig = loadJson(AUTH_PROVIDER_FILE);
    return fileConfig.provider || 'json_file';
  } catch {
    return 'json_file';
  }
}

/**
 * Persist provider to auth-provider.json AND system_config table (if DB ready).
 * @param {string} provider
 */
async function saveAuthProvider(provider) {
  const existing = loadJson(AUTH_PROVIDER_FILE);
  existing.provider = provider;
  saveJson(AUTH_PROVIDER_FILE, existing);

  try {
    await DatabaseService.query(
      `INSERT INTO ${schema}.system_config (key, value, description, updated_at)
       VALUES ('auth_provider', $1, 'Active authentication provider', NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [JSON.stringify({ provider })]
    );
  } catch {
    // DB not available — file save is sufficient
  }
}

/**
 * Authenticate against DefaultAdminUser.json (json_file provider).
 */
function loginWithJsonFile(email, password) {
  const { users } = loadJson(USERS_FILE);
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

  if (!user) return { error: 'INVALID_CREDENTIALS' };
  if (user.status !== 'active') return { error: 'ACCOUNT_INACTIVE' };
  if (user.password !== password) return { error: 'INVALID_CREDENTIALS' };

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      authMethod: 'json_file',
    },
  };
}

/**
 * Authenticate against PostgreSQL system_users (database provider).
 */
async function loginWithDatabase(email, password) {
  const result = await DatabaseService.query(
    `SELECT id, email, name, role, password_hash, status FROM ${schema}.system_users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );

  const user = result.rows[0];
  if (!user) return { error: 'INVALID_CREDENTIALS' };
  if (user.status !== 'active') return { error: 'ACCOUNT_INACTIVE' };

  // If password_hash is null, use default password and set hash on first login
  if (!user.password_hash) {
    const defaultPassword = config.auth.defaultPassword;
    if (password !== defaultPassword) return { error: 'INVALID_CREDENTIALS' };
    const hash = await hashPassword(defaultPassword);
    await DatabaseService.query(
      `UPDATE ${schema}.system_users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [hash, user.id]
    );
  } else {
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) return { error: 'INVALID_CREDENTIALS' };
  }

  await DatabaseService.query(
    `UPDATE ${schema}.system_users SET last_login = NOW() WHERE id = $1`,
    [user.id]
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      authMethod: 'database',
    },
  };
}

// ── GET /auth/config (Public) ───────────────────────────────────────────────
router.get('/config', async (req, res) => {
  try {
    const fileConfig = loadJson(AUTH_PROVIDER_FILE);
    const activeProvider = await getAuthProvider();

    logger.info(messages.success.authProviderLoaded, {
      provider: activeProvider, requestId: req.requestId,
    });

    res.json({
      success: true,
      data: {
        provider: activeProvider,
        availableProviders: fileConfig.availableProviders || ['json_file', 'database', 'social'],
        social: fileConfig.social || { enabled: false },
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: { message: errors.errors.authProviderSaveFailed },
    });
  }
});

// ── POST /auth/config (Protected — super_admin only) ────────────────────────
router.post('/config', authenticate, requireRole('super_admin'), async (req, res) => {
  const { provider } = req.body;
  const validProviders = ['json_file', 'database', 'social'];

  if (!provider || !validProviders.includes(provider)) {
    return res.status(400).json({
      success: false,
      error: { message: errors.errors.authProviderInvalid, code: 'INVALID_PROVIDER' },
    });
  }

  // Verify DB readiness when switching to database provider
  if (provider === 'database') {
    try {
      const status = await DatabaseService.getSchemaStatus();
      if (!status.initialized || !status.hasDefaultData) {
        return res.status(400).json({
          success: false,
          error: { message: errors.errors.authProviderDbNotReady, code: 'DB_NOT_READY' },
        });
      }
    } catch {
      return res.status(400).json({
        success: false,
        error: { message: errors.errors.authProviderDbNotReady, code: 'DB_NOT_READY' },
      });
    }
  }

  try {
    await saveAuthProvider(provider);
    logger.info(messages.success.authProviderSaved, {
      provider, userId: req.user.userId, requestId: req.requestId,
    });
    res.json({
      success: true,
      data: { provider, message: messages.success.authProviderSaved },
    });
  } catch (err) {
    logger.error(errors.errors.authProviderSaveFailed, {
      error: err.message, requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: { message: errors.errors.authProviderSaveFailed, code: 'SAVE_FAILED' },
    });
  }
});

// ── POST /auth/login (Public) ───────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: { message: errors.errors.authCredentialsRequired, code: 'CREDENTIALS_REQUIRED' },
    });
  }

  try {
    const provider = await getAuthProvider();
    let result;

    if (provider === 'json_file') {
      result = loginWithJsonFile(email, password);
    } else if (provider === 'database') {
      result = await loginWithDatabase(email, password);
    } else {
      return res.status(400).json({
        success: false,
        error: { message: errors.errors.authProviderInvalid, code: 'UNSUPPORTED_PROVIDER' },
      });
    }

    if (result.error === 'INVALID_CREDENTIALS') {
      return res.status(401).json({
        success: false,
        error: { message: errors.errors.authInvalidCredentials, code: 'INVALID_CREDENTIALS' },
      });
    }

    if (result.error === 'ACCOUNT_INACTIVE') {
      return res.status(403).json({
        success: false,
        error: { message: errors.errors.authAccountInactive, code: 'ACCOUNT_INACTIVE' },
      });
    }

    const accessToken = generateAccessToken(result.user);
    const refreshToken = generateRefreshToken(result.user);

    // Set HttpOnly cookies for frontend security
    const cookieOptions = {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: config.auth.jwtExpiresInSeconds * 1000,
    };

    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    logger.info(messages.success.authLoginSuccess, {
      userId: result.user.id, email: result.user.email,
      provider, requestId: req.requestId,
    });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: config.auth.jwtExpiresInSeconds,
        user: result.user,
      },
    });
  } catch (err) {
    logger.error(errors.errors.authLoginFailed, {
      error: err.message, requestId: req.requestId,
    });
    res.status(500).json({
      success: false,
      error: { message: errors.errors.authLoginFailed, code: 'SERVER_ERROR' },
    });
  }
});

// ── POST /auth/refresh ──────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: { message: errors.errors.authRefreshTokenRequired },
    });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const provider = await getAuthProvider();
    let user;

    if (provider === 'json_file') {
      const { users } = loadJson(USERS_FILE);
      user = users.find(u => u.id === decoded.userId && u.status === 'active');
      if (user) user = { id: user.id, email: user.email, name: user.name, role: user.role };
    } else {
      const result = await DatabaseService.query(
        `SELECT id, email, name, role, status FROM ${schema}.system_users WHERE id = $1`,
        [decoded.userId]
      );
      const dbUser = result.rows[0];
      if (dbUser?.status === 'active') user = dbUser;
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: errors.errors.authRefreshInvalid },
      });
    }

    const newAccessToken = generateAccessToken(user);
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: config.auth.jwtExpiresInSeconds * 1000,
    });

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: config.auth.jwtExpiresInSeconds,
      },
    });
  } catch (err) {
    logger.warn(errors.errors.authRefreshInvalid, {
      error: err.message, requestId: req.requestId,
    });
    res.status(401).json({
      success: false,
      error: { message: errors.errors.authRefreshInvalid },
    });
  }
});

// ── POST /auth/logout (Protected) ──────────────────────────────────────────
router.post('/logout', authenticate, (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  logger.info(messages.success.authLogoutSuccess, {
    userId: req.user.userId, requestId: req.requestId,
  });
  res.json({
    success: true,
    data: { message: messages.success.authLogoutSuccess },
  });
});

// ── GET /auth/me (Protected) ───────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const provider = await getAuthProvider();

    if (provider === 'json_file') {
      const { users } = loadJson(USERS_FILE);
      const user = users.find(u => u.id === req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: errors.errors.authUserNotFound },
        });
      }
      return res.json({
        success: true,
        data: { id: user.id, email: user.email, name: user.name, role: user.role, authMethod: 'json_file' },
      });
    }

    const result = await DatabaseService.query(
      `SELECT id, email, name, role, status, last_login, created_at FROM ${schema}.system_users WHERE id = $1`,
      [req.user.userId]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: errors.errors.authUserNotFound },
      });
    }
    res.json({ success: true, data: { ...user, authMethod: 'database' } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
