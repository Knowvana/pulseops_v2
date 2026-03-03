// ============================================================================
// UILogService — PulseOps V2 Frontend Logging Service
//
// PURPOSE: Captures frontend console output and fetch API calls in real-time.
// Stores entries in memory for display in the RightLogsView panel, and
// periodically pushes batches to the backend via POST /api/logs/ui.
//
// FEATURES:
//   - Intercepts console.log/info/warn/error/debug
//   - Intercepts window.fetch to capture API calls (method, url, status, duration)
//   - In-memory ring buffer (max entries configurable)
//   - Periodic batch push to backend (configurable interval)
//   - Subscribe/unsubscribe pattern for React components
//
// USAGE:
//   import UILogService from '@shared/services/UILogService';
//   UILogService.init();              // Call once at app start
//   UILogService.subscribe(callback); // Listen for new entries
//   UILogService.destroy();           // Cleanup on app unmount
//
// ARCHITECTURE: Singleton service. Does NOT depend on React. Listeners
// are notified synchronously when new entries arrive.
// ============================================================================
import urls from '@config/urls.json';

const MAX_LOG_ENTRIES = 500;
const MAX_API_ENTRIES = 200;
const PUSH_INTERVAL_MS = 30000;

class UILogServiceClass {
  constructor() {
    this._logs = [];
    this._apiCalls = [];
    this._listeners = new Set();
    this._pushTimer = null;
    this._initialized = false;
    this._originalConsole = {};
    this._originalFetch = null;
    this._pendingPush = [];
    this._notifyTimer = null;
    this._notifyPending = false;
    this._currentTxId = null;
  }

  _generateTxId() {
    return `txn-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`;
  }

  // ── Init: Intercept console + fetch ──────────────────────────────────────
  init() {
    if (this._initialized) return;
    this._initialized = true;

    // Save originals
    this._originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    };
    this._originalFetch = window.fetch.bind(window);

    // Intercept console methods
    const levels = ['log', 'info', 'warn', 'error', 'debug'];
    levels.forEach((level) => {
      console[level] = (...args) => {
        this._originalConsole[level](...args);
        const mappedLevel = level === 'log' ? 'info' : level;
        this._addLog(mappedLevel, args);
      };
    });

    // Intercept fetch
    window.fetch = async (...args) => {
      const [input, init] = args;
      const requestUrl = typeof input === 'string' ? input : input?.url || String(input);
      const method = init?.method?.toUpperCase() || 'GET';
      const start = performance.now();

      // Generate a transaction ID per request and share it with the backend
      // This links UI logs and API logs for the same user action
      const isLogPush = requestUrl.includes('/api/logs/') && method === 'POST';
      if (!isLogPush) {
        this._currentTxId = this._generateTxId();
      }
      const augmentedInit = {
        ...(init || {}),
        headers: {
          ...(init?.headers || {}),
          ...(!isLogPush && this._currentTxId ? { 'X-Transaction-Id': this._currentTxId } : {}),
        },
      };

      try {
        const response = await this._originalFetch(input, augmentedInit);
        const duration = Math.round(performance.now() - start);
        this._addApiCall({
          method,
          url: this._shortenUrl(requestUrl),
          fullUrl: requestUrl,
          status: response.status,
          duration,
          timestamp: new Date().toLocaleTimeString(),
        });
        return response;
      } catch (err) {
        const duration = Math.round(performance.now() - start);
        this._addApiCall({
          method,
          url: this._shortenUrl(requestUrl),
          fullUrl: requestUrl,
          status: 0,
          duration,
          error: err.message,
          transactionId: this._currentTxId,
          timestamp: new Date().toLocaleTimeString(),
        });
        throw err;
      }
    };

    // Start periodic push
    this._pushTimer = setInterval(() => this.pushToBackend(), PUSH_INTERVAL_MS);
  }

  // ── Destroy: Restore originals ───────────────────────────────────────────
  destroy() {
    if (!this._initialized) return;

    // Restore console
    Object.keys(this._originalConsole).forEach((level) => {
      console[level] = this._originalConsole[level];
    });

    // Restore fetch
    if (this._originalFetch) {
      window.fetch = this._originalFetch;
    }

    // Clear timers
    if (this._pushTimer) {
      clearInterval(this._pushTimer);
      this._pushTimer = null;
    }
    if (this._notifyTimer) {
      clearTimeout(this._notifyTimer);
      this._notifyTimer = null;
    }

    this._initialized = false;
  }

  // ── Subscribe / Unsubscribe ──────────────────────────────────────────────
  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  // ── Getters ──────────────────────────────────────────────────────────────
  getLogs() { return this._logs; }
  getApiCalls() { return this._apiCalls; }

  // ── Clear ────────────────────────────────────────────────────────────────
  clearLogs() {
    this._logs = [];
    this._notify();
  }

  clearApiCalls() {
    this._apiCalls = [];
    this._notify();
  }

  // ── Manual log entry ─────────────────────────────────────────────────────
  log(level, source, message, data) {
    const entry = {
      level: level || 'info',
      source: source || 'UI',
      module: 'Core',
      message: typeof message === 'string' ? message : JSON.stringify(message),
      data: data || null,
      timestamp: new Date().toLocaleTimeString(),
      isoTimestamp: new Date().toISOString(),
    };
    this._logs = [...this._logs.slice(-(MAX_LOG_ENTRIES - 1)), entry];
    this._pendingPush.push(entry);
    this._notify();
  }

  // ── Push to backend ──────────────────────────────────────────────────────
  async pushToBackend() {
    if (this._pendingPush.length === 0) return;
    const batch = [...this._pendingPush];
    this._pendingPush = [];

    try {
      // urls.logs.ui = '/api/logs/ui' - already a full relative path
      // Vite proxy forwards /api/* to backend. Do NOT prepend server url (causes CORS).
      const endpoint = urls.logs.ui;
      // Use original fetch to avoid recursion
      const fetcher = this._originalFetch || window.fetch;
      await fetcher(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entries: batch.map((e) => ({
            level: e.level,
            source: e.source || 'UI',
            module: e.module || 'Core',
            event: 'console',
            component: e.source || 'Console',
            message: e.message,
            transactionId: e.transactionId || null,
            result: null,
            timestamp: e.isoTimestamp || new Date().toISOString(),
          })),
        }),
      });
    } catch {
      // Re-queue on failure (avoid infinite growth)
      if (this._pendingPush.length < MAX_LOG_ENTRIES) {
        this._pendingPush = [...batch, ...this._pendingPush];
      }
    }
  }

  // ── Internal: Add console log ────────────────────────────────────────────
  _addLog(level, args) {
    const message = args
      .map((a) => {
        if (typeof a === 'string') return a;
        try { return JSON.stringify(a); } catch { return String(a); }
      })
      .join(' ');

    // Skip internal log service messages to avoid recursion
    if (message.includes('[UILogService]')) return;

    const source = this._extractSource(message);

    const entry = {
      level,
      source,
      module: 'Core',
      message,
      transactionId: this._currentTxId || null,
      timestamp: new Date().toLocaleTimeString(),
      isoTimestamp: new Date().toISOString(),
    };

    this._logs = [...this._logs.slice(-(MAX_LOG_ENTRIES - 1)), entry];
    this._pendingPush.push(entry);
    this._notify();
  }

  // ── Internal: Add API call ───────────────────────────────────────────────
  _addApiCall(entry) {
    // Skip log push calls to avoid recursion
    if (entry.fullUrl?.includes('/api/logs/ui') && entry.method === 'POST') return;

    this._apiCalls = [...this._apiCalls.slice(-(MAX_API_ENTRIES - 1)), { ...entry, transactionId: this._currentTxId }];
    this._notify();
  }

  // ── Internal: Shorten URL for display ────────────────────────────────────
  _shortenUrl(url) {
    try {
      const u = new URL(url, window.location.origin);
      return u.pathname + (u.search ? u.search.slice(0, 30) : '');
    } catch {
      return url.length > 60 ? url.slice(0, 60) + '...' : url;
    }
  }

  // ── Internal: Extract source from message ────────────────────────────────
  _extractSource(message) {
    // Match patterns like [Frontend], [Auth], [PlatformDashboard], etc.
    const match = message.match(/\[([^\]]+)\]/);
    if (match) return match[1];
    return 'Console';
  }

  // ── Internal: Notify listeners (throttled to max ~4/sec) ─────────────────
  _notify() {
    this._notifyPending = true;
    if (this._notifyTimer) return;
    this._notifyTimer = setTimeout(() => {
      this._notifyTimer = null;
      if (!this._notifyPending) return;
      this._notifyPending = false;
      const snapshot = { logs: this._logs, apiCalls: this._apiCalls };
      this._listeners.forEach((cb) => {
        try { cb(snapshot); } catch { /* ignore listener errors */ }
      });
    }, 250);
  }
}

const UILogService = new UILogServiceClass();
export default UILogService;
