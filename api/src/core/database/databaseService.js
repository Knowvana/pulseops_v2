// ============================================================================
// Database Service — PulseOps V2 API
//
// PURPOSE: Core database operations using pg (node-postgres). Handles
// connection pooling, schema management, health checks, data seeding,
// and CRUD operations for the platform.
//
// SCHEMA: All tables are created under the configured schema (default: pulseops)
//   - system_users   → Application authentication and authorization
//   - system_config   → Key-value configuration storage (JSONB)
//   - system_modules  → Module management and hot-drop tracking
//   - system_logs     → Centralized log storage
//
// ARCHITECTURE:
//   - Singleton connection pool (lazy initialization)
//   - All queries use parameterized statements (SQL injection prevention)
//   - Transactions with BEGIN/COMMIT/ROLLBACK for multi-step operations
//   - Pool error handling with auto-recovery
//   - Graceful shutdown support for K8s
//
// USAGE:
//   import DatabaseService from '../database/databaseService.js';
//   const result = await DatabaseService.testConnection();
//   await DatabaseService.createSchema();
//   await DatabaseService.query('SELECT * FROM pulseops.system_users');
//
// DEPENDENCIES:
//   - pg (npm) — PostgreSQL client
//   - bcryptjs (npm) — password hashing for default admin
//   - ../../config/index.js → database config (host, port, name, schema, etc.)
//   - ../../shared/loadJson.js → messages, errors from JSON
//   - ../../shared/logger.js → structured logging
// ============================================================================
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { config } from '#config';
import { logger } from '#shared/logger.js';
import { messages, errors, loadJson } from '#shared/loadJson.js';

const { Pool } = pg;

let pool = null;

/**
 * Get or create the shared connection pool.
 * Lazy initialization — pool is created on first use.
 * @returns {pg.Pool} PostgreSQL connection pool
 */
function getPool() {
  if (!pool) {
    pool = new Pool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
      ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
      max: config.db.poolSize,
      idleTimeoutMillis: config.db.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.db.connectionTimeoutMillis || 5000,
    });
    pool.on('error', (err) => {
      logger.error(errors.errors.dbConnectionFailed, { error: err.message });
    });
  }
  return pool;
}

const schema = config.db.schema || 'pulseops';

const DatabaseService = {
  /**
   * Reset the shared pool so next operation creates a fresh pool
   * with updated config values. Called after save-config + reloadDbConfig.
   */
  async resetPool() {
    if (pool) {
      await pool.end().catch(() => {});
      pool = null;
    }
  },

  // ── Database Creation / Deletion ──────────────────────────────────────────

  /**
   * Create the target database if it does not exist.
   * Connects to the default 'postgres' database to run CREATE DATABASE.
   * @returns {Promise<Object>} { created: boolean, database: string }
   */
  async createDatabase() {
    const adminPool = new Pool({
      host: config.db.host,
      port: config.db.port,
      database: 'postgres',
      user: config.db.user,
      password: config.db.password,
      ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
    });
    const client = await adminPool.connect();
    try {
      const dbName = config.db.name;
      const check = await client.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
      );
      if (check.rows.length === 0) {
        await client.query(`CREATE DATABASE "${dbName}"`);
        logger.info(messages.success.dbCreated, { database: dbName });
        return { created: true, database: dbName };
      }
      return { created: false, database: dbName, message: 'Database already exists.' };
    } finally {
      client.release();
      await adminPool.end();
    }
  },

  /**
   * Drop (delete) the target database entirely.
   * Terminates all active connections first so the DROP succeeds.
   * @returns {Promise<Object>} { deleted: boolean, database: string }
   */
  async dropDatabase() {
    const adminPool = new Pool({
      host: config.db.host,
      port: config.db.port,
      database: 'postgres',
      user: config.db.user,
      password: config.db.password,
      ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
    });
    const client = await adminPool.connect();
    try {
      const dbName = config.db.name;
      const check = await client.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
      );
      if (check.rows.length === 0) {
        return { deleted: false, database: dbName, message: 'Database does not exist.' };
      }
      // Terminate all active connections to the target DB before dropping
      await client.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [dbName]
      );
      await client.query(`DROP DATABASE "${dbName}"`);
      // Reset the shared pool so it reconnects if DB is recreated
      if (pool) { await pool.end().catch(() => {}); pool = null; }
      logger.info(messages.success.dbDeleted, { database: dbName });
      return { deleted: true, database: dbName };
    } finally {
      client.release();
      await adminPool.end();
    }
  },

  // ── Connection Testing ────────────────────────────────────────────────────

  /**
   * Test connection to the database and return latency + version info.
   * @param {Object} [customConfig] - Optional override config { host, port, database, user, password }
   * @returns {Promise<Object>} { connected, latencyMs, dbVersion, message }
   */
  async testConnection(customConfig) {
    let testPool;
    if (customConfig) {
      testPool = new Pool({
        host: customConfig.host || config.db.host,
        port: parseInt(customConfig.port, 10) || config.db.port,
        database: customConfig.database || config.db.name,
        user: customConfig.username || customConfig.user || config.db.user,
        password: customConfig.password || config.db.password,
        ssl: false,
        connectionTimeoutMillis: 5000,
      });
    }

    const start = Date.now();
    const targetPool = testPool || getPool();
    const client = await targetPool.connect();
    try {
      const result = await client.query('SELECT version()');
      const latency = Date.now() - start;
      const versionString = result.rows[0]?.version || '';
      const dbType = versionString.split(' ')[0] || 'Unknown';
      return {
        connected: true,
        latencyMs: latency,
        dbVersion: versionString,
        dbType,
        message: messages.success.dbConnected,
      };
    } finally {
      client.release();
      if (testPool) await testPool.end();
    }
  },

  // ── Schema Management ─────────────────────────────────────────────────────

  /**
   * Check schema status: is the schema created? Are core tables present?
   * @returns {Promise<Object>} { connected, initialized, hasDefaultData, tables }
   */
  async getSchemaStatus() {
    const client = await getPool().connect();
    try {
      // Check if schema exists
      const schemaCheck = await client.query(
        `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
        [schema]
      );
      if (schemaCheck.rows.length === 0) {
        return { connected: true, initialized: false, hasDefaultData: false, tables: [] };
      }

      // Check for core tables
      const tableCheck = await client.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
        [schema]
      );
      const tables = tableCheck.rows.map(r => r.table_name);
      const coreTables = ['system_users', 'system_config', 'system_modules', 'system_logs'];
      const initialized = coreTables.every(t => tables.includes(t));

      // Check for default data
      let hasDefaultData = false;
      if (initialized) {
        const userCheck = await client.query(`SELECT COUNT(*) FROM ${schema}.system_users`);
        hasDefaultData = parseInt(userCheck.rows[0].count, 10) > 0;
      }

      return { connected: true, initialized, hasDefaultData, tables };
    } finally {
      client.release();
    }
  },

  /**
   * Create the core database schema and all required tables.
   * Uses transactions for atomicity.
   * Tables created:
   *   - system_users: Authentication and authorization
   *   - system_config: Key-value config storage (JSONB values)
   *   - system_modules: Module registry for hot-drop management
   *   - system_logs: Centralized logging
   * @returns {Promise<Object>} { success, message, tables }
   */
  async createSchema() {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');

      // Create schema if not exists
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);

      // system_users — Authentication & authorization
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.system_users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          name VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'user',
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          last_login TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // system_config — Key-value configuration storage
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.system_config (
          id SERIAL PRIMARY KEY,
          key VARCHAR(255) UNIQUE NOT NULL,
          value JSONB NOT NULL DEFAULT '{}',
          description TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // system_modules — Module management & hot-drop tracking
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.system_modules (
          id SERIAL PRIMARY KEY,
          module_id VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
          description TEXT,
          is_core BOOLEAN DEFAULT FALSE,
          enabled BOOLEAN DEFAULT FALSE,
          schema_initialized BOOLEAN DEFAULT FALSE,
          "order" INTEGER DEFAULT 99,
          installed_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // system_logs — Centralized log storage
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.system_logs (
          id SERIAL PRIMARY KEY,
          level VARCHAR(10) NOT NULL,
          source VARCHAR(100),
          message TEXT NOT NULL,
          data JSONB,
          user_id INTEGER,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await client.query('COMMIT');
      logger.info(messages.success.schemaCreated);

      return {
        success: true,
        message: messages.success.schemaCreated,
        tables: ['system_users', 'system_config', 'system_modules', 'system_logs'],
      };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(errors.errors.schemaInitFailed, { error: err.message });
      throw err;
    } finally {
      client.release();
    }
  },

  // ── Default Data Seeding ──────────────────────────────────────────────────

  /**
   * Load default seed data: admin user + core module registrations.
   * Admin password is hashed with bcrypt before storage.
   * @returns {Promise<Object>} { success, message }
   */
  async loadDefaultData() {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');

      // Load admin user from DefaultAdminUser.json
      const adminConfig = loadJson('DefaultAdminUser.json');
      const defaultAdmin = adminConfig.users[0];
      const passwordHash = await bcrypt.hash(defaultAdmin.password, config.auth.bcryptRounds || 12);

      await client.query(`
        INSERT INTO ${schema}.system_users (email, password_hash, name, role, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW()
      `, [defaultAdmin.email, passwordHash, defaultAdmin.name, defaultAdmin.role, defaultAdmin.status]);

      // Register core modules
      await client.query(`
        INSERT INTO ${schema}.system_modules (module_id, name, version, description, is_core, enabled, schema_initialized, "order")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (module_id) DO NOTHING
      `, ['platform_admin', 'Admin', '2.0.0', 'Platform dashboard, module management, and global settings', true, true, true, 0]);

      await client.query(`
        INSERT INTO ${schema}.system_modules (module_id, name, version, description, is_core, enabled, schema_initialized, "order")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (module_id) DO NOTHING
      `, ['auth', 'Authentication', '2.0.0', 'Global authentication, authorization, user management, RBAC, session control', true, true, true, 1]);

      await client.query('COMMIT');
      logger.info(messages.success.defaultDataLoaded);

      return { success: true, message: messages.success.defaultDataLoaded };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(errors.errors.dbInitFailed, { error: err.message });
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Clean default data (remove seeded records).
   * @returns {Promise<Object>} { success, message }
   */
  async cleanDefaultData() {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM ${schema}.system_users WHERE email = 'admin@test.com'`);
      await client.query(`DELETE FROM ${schema}.system_modules WHERE is_core = true`);
      await client.query('COMMIT');
      return { success: true, message: messages.success.defaultDataCleaned };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // ── Destructive Operations ────────────────────────────────────────────────

  /**
   * Wipe all tables by dropping the entire schema (destructive!).
   * @returns {Promise<Object>} { success, message }
   */
  async wipeDatabase() {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await client.query('COMMIT');
      logger.info(messages.success.dbWiped);
      return { success: true, message: messages.success.dbWiped };
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(errors.errors.dbWipeFailed, { error: err.message });
      throw err;
    } finally {
      client.release();
    }
  },

  // ── Statistics ────────────────────────────────────────────────────────────

  /**
   * Get database stats (table counts and sizes).
   * @returns {Promise<Object>} { tables: [{ table_name, size }] }
   */
  async getStats() {
    const client = await getPool().connect();
    try {
      const result = await client.query(`
        SELECT table_name,
          pg_size_pretty(pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name))) as size
        FROM information_schema.tables
        WHERE table_schema = $1
        ORDER BY table_name
      `, [schema]);
      return { tables: result.rows };
    } finally {
      client.release();
    }
  },

  // ── Generic Query ─────────────────────────────────────────────────────────

  /**
   * Execute a parameterized query using the shared pool.
   * @param {string} text - SQL query text with $1, $2, ... placeholders
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} pg result { rows, rowCount, ... }
   */
  async query(text, params) {
    const client = await getPool().connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  },

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Shutdown the pool gracefully. Called during K8s SIGTERM handling.
   */
  async shutdown() {
    if (pool) {
      await pool.end();
      pool = null;
    }
  },
};

export default DatabaseService;
