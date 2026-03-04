// ============================================================================
// LogService — PulseOps V2 API
//
// PURPOSE: Enterprise log management service that handles reading, writing,
// and deleting logs from both JSON files and PostgreSQL database.
// Supports two log types: UI Logs and API Logs.
//
// STORAGE MODES:
//   - "file"     → JSON files in api/logs/ (default, no DB required)
//   - "database" → PostgreSQL tables (system_ui_logs, system_api_logs)
//
// ARCHITECTURE:
//   - Reads storage mode from LogsConfig.json at startup
//   - All modules write logs with a LogModule column for filtering
//   - Core platform logs use "Core" as the module identifier
//   - Supports batch inserts for performance
//   - File rotation when maxEntries is reached
//
// DEPENDENCIES:
//   - fs/path          → File-based log I/O
//   - DatabaseService   → Database-based log I/O
//   - LogsConfig.json   → Storage configuration
//   - APIMessages.json  → Response messages
//   - APIErrors.json    → Error messages
// ============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '#config';
import { logger } from '#shared/logger.js';
import { loadJson, messages, errors } from '#shared/loadJson.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '../../..');

// Load log config
let logsConfig = loadJson('LogsConfig.json');

/**
 * Reload logs config from disk (called when config changes).
 */
function reloadConfig() {
  logsConfig = loadJson('LogsConfig.json');
}

/**
 * Get the current storage mode.
 * @returns {string} "file" or "database"
 */
function getStorageMode() {
  return logsConfig.storage || 'file';
}

/**
 * Resolve the absolute path for a log file.
 * @param {string} logType - "ui" or "api"
 * @returns {string} Absolute path to the log file
 */
function getLogFilePath(logType) {
  const relativePath = logType === 'ui'
    ? logsConfig.file.uiLogsPath
    : logsConfig.file.apiLogsPath;
  return path.resolve(apiRoot, relativePath);
}

/**
 * Ensure the log file exists with a valid JSON array.
 * @param {string} filePath
 */
function ensureLogFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf8');
  }
}

// ── File-Based Operations ────────────────────────────────────────────────────

/**
 * Read all logs from a JSON file.
 * @param {string} logType - "ui" or "api"
 * @returns {Array} Array of log entries
 */
function readLogsFromFile(logType) {
  const filePath = getLogFilePath(logType);
  ensureLogFile(filePath);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Write logs array to a JSON file.
 * @param {string} logType - "ui" or "api"
 * @param {Array} logs - Array of log entries
 */
function writeLogsToFile(logType, logs) {
  const filePath = getLogFilePath(logType);
  ensureLogFile(filePath);
  const maxEntries = logsConfig.file.maxEntries || 5000;
  const trimmed = logs.length > maxEntries ? logs.slice(-maxEntries) : logs;
  fs.writeFileSync(filePath, JSON.stringify(trimmed, null, 2), 'utf8');
}

/**
 * Append log entries to a JSON file.
 * @param {string} logType - "ui" or "api"
 * @param {Array} entries - New log entries to append
 * @returns {number} Total count after append
 */
function appendLogsToFile(logType, entries) {
  const existing = readLogsFromFile(logType);
  const updated = [...existing, ...entries];
  writeLogsToFile(logType, updated);
  return updated.length;
}

/**
 * Delete all logs from a JSON file.
 * @param {string} logType - "ui" or "api"
 */
function deleteLogsFromFile(logType) {
  const filePath = getLogFilePath(logType);
  ensureLogFile(filePath);
  fs.writeFileSync(filePath, '[]', 'utf8');
}

/**
 * Get file log stats (count, file size, last modified).
 * @param {string} logType - "ui" or "api"
 * @returns {Object} { count, fileSize, lastModified }
 */
function getFileLogStats(logType) {
  const filePath = getLogFilePath(logType);
  ensureLogFile(filePath);
  try {
    const stat = fs.statSync(filePath);
    const logs = readLogsFromFile(logType);
    return {
      count: logs.length,
      fileSize: stat.size,
      lastModified: stat.mtime.toISOString(),
    };
  } catch {
    return { count: 0, fileSize: 0, lastModified: null };
  }
}

// ── Database-Based Operations ────────────────────────────────────────────────

/**
 * Get the database table name for a log type.
 * @param {string} logType - "ui" or "api"
 * @returns {string} Fully qualified table name (schema.table)
 */
function getLogTable(logType) {
  const schema = config.db.schema || 'pulseops';
  const table = logType === 'ui'
    ? (logsConfig.database.uiLogsTable || 'system_ui_logs')
    : (logsConfig.database.apiLogsTable || 'system_api_logs');
  return `${schema}.${table}`;
}

/**
 * Lazily import DatabaseService to avoid circular deps.
 * @returns {Promise<Object>} DatabaseService
 */
async function getDbService() {
  const mod = await import('#core/database/databaseService.js');
  return mod.default;
}

/**
 * Read logs from database with optional filters.
 * @param {string} logType - "ui" or "api"
 * @param {Object} filters - { level, search, limit, offset }
 * @returns {Promise<Array>}
 */
async function readLogsFromDb(logType, filters = {}) {
  const db = await getDbService();
  const table = getLogTable(logType);
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (filters.level && filters.level !== 'all') {
    conditions.push(`log_level = $${paramIndex++}`);
    params.push(filters.level);
  }
  if (filters.search) {
    conditions.push(`(message ILIKE $${paramIndex} OR file_name ILIKE $${paramIndex} OR event ILIKE $${paramIndex})`);
    params.push(`%${filters.search}%`);
    paramIndex++;
  }
  if (filters.module) {
    conditions.push(`log_module = $${paramIndex++}`);
    params.push(filters.module);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit || 500;
  const offset = filters.offset || 0;

  const result = await db.query(
    `SELECT * FROM ${table} ${where} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  );
  return result.rows;
}

/**
 * Insert log entries into the database.
 * @param {string} logType - "ui" or "api"
 * @param {Array} entries - Log entries to insert
 * @returns {Promise<number>} Number of rows inserted
 */
async function writeLogsToDb(logType, entries) {
  if (!entries || entries.length === 0) return 0;
  const db = await getDbService();
  const table = getLogTable(logType);

  if (logType === 'ui') {
    for (const entry of entries) {
      await db.query(
        `INSERT INTO ${table} (transaction_id, log_level, source, event, file_name, log_module, user_name, message, result, data, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          entry.transactionId || null,
          entry.level || 'info',
          entry.source || 'UI',
          entry.event || null,
          entry.fileName || null,
          entry.module || 'Core',
          entry.user || 'Anonymous',
          entry.message || '',
          entry.result || null,
          entry.data ? JSON.stringify(entry.data) : null,
          entry.timestamp || new Date().toISOString(),
        ]
      );
    }
  } else {
    for (const entry of entries) {
      await db.query(
        `INSERT INTO ${table} (transaction_id, log_level, source, user_name, log_module, api_url, method, status_code, response_time_ms, request_body, response_body, error, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          entry.transactionId || null,
          entry.level || 'info',
          entry.source || 'API',
          entry.user || 'Anonymous',
          entry.module || 'Core',
          entry.url || null,
          entry.method || null,
          entry.statusCode || null,
          entry.responseTime || null,
          entry.requestBody ? JSON.stringify(entry.requestBody) : null,
          entry.responseBody ? JSON.stringify(entry.responseBody) : null,
          entry.error || null,
          entry.timestamp || new Date().toISOString(),
        ]
      );
    }
  }
  return entries.length;
}

/**
 * Delete all logs from a database table.
 * @param {string} logType - "ui" or "api"
 * @returns {Promise<number>} Number of rows deleted
 */
async function deleteLogsFromDb(logType) {
  const db = await getDbService();
  const table = getLogTable(logType);
  const result = await db.query(`DELETE FROM ${table}`);
  return result.rowCount;
}

/**
 * Get database log stats (count, last entry).
 * @param {string} logType - "ui" or "api"
 * @returns {Promise<Object>} { count, lastEntry }
 */
async function getDbLogStats(logType) {
  const db = await getDbService();
  const table = getLogTable(logType);
  try {
    const countResult = await db.query(`SELECT COUNT(*) FROM ${table}`);
    const lastResult = await db.query(`SELECT created_at FROM ${table} ORDER BY created_at DESC LIMIT 1`);
    return {
      count: parseInt(countResult.rows[0].count, 10),
      lastEntry: lastResult.rows[0]?.created_at || null,
    };
  } catch {
    return { count: 0, lastEntry: null };
  }
}

/**
 * Check if log tables exist in the database.
 * @returns {Promise<boolean>}
 */
async function checkLogTablesExist() {
  try {
    const db = await getDbService();
    const schema = config.db.schema || 'pulseops';
    const result = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name IN ($2, $3)`,
      [schema, logsConfig.database.uiLogsTable || 'system_ui_logs', logsConfig.database.apiLogsTable || 'system_api_logs']
    );
    return result.rows.length === 2;
  } catch {
    return false;
  }
}

/**
 * Create log tables in the database if they don't exist.
 * @returns {Promise<Object>} { created, tables }
 */
async function createLogTables() {
  const db = await getDbService();
  const schema = config.db.schema || 'pulseops';
  const uiTable = logsConfig.database.uiLogsTable || 'system_ui_logs';
  const apiTable = logsConfig.database.apiLogsTable || 'system_api_logs';

  await db.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.${uiTable} (
      id SERIAL PRIMARY KEY,
      transaction_id VARCHAR(100),
      log_level VARCHAR(10) NOT NULL DEFAULT 'info',
      source VARCHAR(20) DEFAULT 'UI',
      event VARCHAR(255),
      file_name VARCHAR(255),
      log_module VARCHAR(100) DEFAULT 'Core',
      user_name VARCHAR(255),
      message TEXT NOT NULL,
      result TEXT,
      data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS ${schema}.${apiTable} (
      id SERIAL PRIMARY KEY,
      transaction_id VARCHAR(100),
      log_level VARCHAR(10) NOT NULL DEFAULT 'info',
      source VARCHAR(20) DEFAULT 'API',
      user_name VARCHAR(255),
      log_module VARCHAR(100) DEFAULT 'Core',
      api_url TEXT,
      method VARCHAR(10),
      status_code INTEGER,
      response_time_ms INTEGER,
      request_body JSONB,
      response_body JSONB,
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Create indexes for performance
  await db.query(`CREATE INDEX IF NOT EXISTS idx_${uiTable}_level ON ${schema}.${uiTable}(log_level)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_${uiTable}_module ON ${schema}.${uiTable}(log_module)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_${uiTable}_created ON ${schema}.${uiTable}(created_at DESC)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_${apiTable}_level ON ${schema}.${apiTable}(log_level)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_${apiTable}_module ON ${schema}.${apiTable}(log_module)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_${apiTable}_created ON ${schema}.${apiTable}(created_at DESC)`);

  logger.info('Log tables created successfully');
  return { created: true, tables: [`${schema}.${uiTable}`, `${schema}.${apiTable}`] };
}

// ── Public API ───────────────────────────────────────────────────────────────

const LogService = {
  /**
   * Get the current logging configuration.
   * @returns {Object} Current LogsConfig
   */
  getConfig() {
    reloadConfig();
    return { ...logsConfig };
  },

  /**
   * Get the current storage mode.
   * @returns {string} "file" or "database"
   */
  getStorageMode() {
    return getStorageMode();
  },

  /**
   * Update the storage mode (file or database).
   * @param {string} mode - "file" or "database"
   */
  async setStorageMode(mode) {
    if (mode !== 'file' && mode !== 'database') {
      throw new Error('Invalid storage mode. Must be "file" or "database".');
    }
    if (mode === 'database') {
      const tablesExist = await checkLogTablesExist();
      if (!tablesExist) {
        await createLogTables();
      }
    }
    const { saveJson } = await import('#shared/loadJson.js');
    logsConfig.storage = mode;
    saveJson('LogsConfig.json', logsConfig);
    reloadConfig();
  },

  /**
   * Read logs with optional filters.
   * @param {string} logType - "ui" or "api"
   * @param {Object} filters - { level, search, module, limit, offset }
   * @returns {Promise<Array>}
   */
  async getLogs(logType, filters = {}) {
    const mode = getStorageMode();
    if (mode === 'database') {
      return readLogsFromDb(logType, filters);
    }
    // File mode — apply filters in memory
    let logs = readLogsFromFile(logType);

    if (filters.level && filters.level !== 'all') {
      logs = logs.filter(l => l.level === filters.level);
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      logs = logs.filter(l =>
        (l.message && l.message.toLowerCase().includes(term)) ||
        (l.fileName && l.fileName.toLowerCase().includes(term)) ||
        (l.event && l.event.toLowerCase().includes(term)) ||
        (l.url && l.url.toLowerCase().includes(term))
      );
    }
    if (filters.module) {
      logs = logs.filter(l => l.module === filters.module);
    }

    // Sort by timestamp descending
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const offset = filters.offset || 0;
    const limit = filters.limit || 500;
    return logs.slice(offset, offset + limit);
  },

  /**
   * Write log entries.
   * @param {string} logType - "ui" or "api"
   * @param {Array} entries - Log entries to write
   * @returns {Promise<Object>} { written, total }
   */
  async writeLogs(logType, entries) {
    if (!entries || entries.length === 0) return { written: 0, total: 0 };

    // Add timestamp if missing
    const timestamped = entries.map(e => ({
      ...e,
      timestamp: e.timestamp || new Date().toISOString(),
    }));

    const mode = getStorageMode();
    if (mode === 'database') {
      const written = await writeLogsToDb(logType, timestamped);
      const stats = await getDbLogStats(logType);
      return { written, total: stats.count };
    }
    const total = appendLogsToFile(logType, timestamped);
    return { written: timestamped.length, total };
  },

  /**
   * Delete all logs for a log type.
   * @param {string} logType - "ui" or "api"
   * @returns {Promise<Object>} { deleted }
   */
  async deleteLogs(logType) {
    const mode = getStorageMode();
    if (mode === 'database') {
      const deleted = await deleteLogsFromDb(logType);
      return { deleted };
    }
    const stats = getFileLogStats(logType);
    deleteLogsFromFile(logType);
    return { deleted: stats.count };
  },

  /**
   * Get log statistics (count, last entry, storage info).
   * @param {string} logType - "ui" or "api"
   * @returns {Promise<Object>} Stats object
   */
  async getStats(logType) {
    const mode = getStorageMode();
    if (mode === 'database') {
      const dbStats = await getDbLogStats(logType);
      return {
        storage: 'database',
        count: dbStats.count,
        lastEntry: dbStats.lastEntry,
        lastSync: new Date().toISOString(),
      };
    }
    const fileStats = getFileLogStats(logType);
    return {
      storage: 'file',
      count: fileStats.count,
      fileSize: fileStats.fileSize,
      lastModified: fileStats.lastModified,
      lastSync: new Date().toISOString(),
    };
  },

  /**
   * Check if database logging is available (tables exist).
   * @returns {Promise<boolean>}
   */
  async isDatabaseLoggingAvailable() {
    return checkLogTablesExist();
  },

  /**
   * Create log tables in the database.
   * @returns {Promise<Object>}
   */
  async createLogTables() {
    return createLogTables();
  },

  /**
   * Write a single API log entry (called by middleware).
   * @param {Object} entry - API log entry
   */
  async writeApiLog(entry) {
    try {
      await this.writeLogs('api', [entry]);
    } catch (err) {
      logger.error('Failed to write API log', { error: err.message });
    }
  },

  /**
   * Get total stats for both log types.
   * @returns {Promise<Object>} { ui, api, storage }
   */
  async getAllStats() {
    const [uiStats, apiStats] = await Promise.all([
      this.getStats('ui'),
      this.getStats('api'),
    ]);
    return {
      storage: getStorageMode(),
      ui: uiStats,
      api: apiStats,
    };
  },
};

export default LogService;
