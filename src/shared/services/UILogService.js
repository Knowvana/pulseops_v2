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
import TimezoneService from '@shared/services/timezoneService';

const MAX_LOG_ENTRIES = 500;
const MAX_API_ENTRIES = 200;
const PUSH_INTERVAL_MS = 30000;

// Pre-compiled regex for performance (avoid re-creation on every _addLog call)
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2702}-\u{27B0}]/gu;
const SOURCE_REGEX = /\[([^\]]+)\]/;

// Messages to skip — React internals, Vite HMR, Chrome violations, DOM warnings
const SKIP_PREFIXES = [
  'Download the React DevTools',
  '[Violation]',
  '[HMR]',
  '[vite]',
  '[DOM]',
  'Password field is not contained',
  'Warning: ',
  'React does not recognize',
  '%c',
];

function formatISTTime() {
  return TimezoneService.formatCurrentTime();
}

function toISTISO() {
  return TimezoneService.toTimezoneISO();
}

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
    this._sessionTxId = null;
    this._userEmail = null;
  }

  _generateSessionTxId() {
    return `ses-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Get the current session transaction ID
   */
  getSessionTxId() {
    return this._sessionTxId;
  }

  /**
   * Override session transaction ID (e.g. for API Explorer sessions)
   */
  setSessionTxId(txId) {
    this._sessionTxId = txId;
  }

  /**
   * Set the authenticated user email for log entries
   */
  setUserEmail(email) {
    this._userEmail = email || null;
  }

  /**
   * Get the current user email
   */
  getUserEmail() {
    return this._userEmail;
  }

  // ── Init: Intercept console + fetch ──────────────────────────────────────
  init() {
    if (this._initialized) {
      // Already initialized - do not regenerate session ID or re-intercept
      return;
    }
    this._initialized = true;

    // Generate session-scoped transaction ID (one per browser session)
    this._sessionTxId = this._generateSessionTxId();

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

      // Send session transaction ID with every API request (except log push calls)
      const isLogPush = requestUrl.includes('/api/logs/') && method === 'POST';
      const augmentedInit = {
        ...(init || {}),
        headers: {
          ...(init?.headers || {}),
          ...(!isLogPush && this._sessionTxId ? { 'X-Transaction-Id': this._sessionTxId } : {}),
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
          transactionId: this._sessionTxId,
          timestamp: formatISTTime(),
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
          transactionId: this._sessionTxId,
          timestamp: formatISTTime(),
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
      user: this._userEmail || null,
      transactionId: this._sessionTxId || null,
      timestamp: formatISTTime(),
      isoTimestamp: toISTISO(),
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
            user: e.user || this._userEmail || null,
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
    // Fast early-exit: skip if first arg matches known noise prefixes
    const firstArg = args[0];
    if (typeof firstArg === 'string') {
      if (firstArg.includes('[UILogService]')) return;
      for (let i = 0; i < SKIP_PREFIXES.length; i++) {
        if (firstArg.startsWith(SKIP_PREFIXES[i])) return;
      }
    }

    const message = args
      .map((a) => {
        if (typeof a === 'string') return a;
        try { return JSON.stringify(a); } catch { return String(a); }
      })
      .join(' ');

    // Second pass skip for joined messages
    if (message.includes('[UILogService]')) return;

    const source = this._extractSource(message);

    // Format in fixed log format: strip emojis, use structured format
    const cleanMessage = message.replace(EMOJI_REGEX, '').trim();

    const entry = {
      level,
      source,
      module: 'Core',
      message: cleanMessage,
      user: this._userEmail || null,
      transactionId: this._sessionTxId || null,
      timestamp: formatISTTime(),
      isoTimestamp: toISTISO(),
    };

    // Use push + conditional trim instead of spread on every call
    this._logs.push(entry);
    if (this._logs.length > MAX_LOG_ENTRIES) {
      this._logs = this._logs.slice(-MAX_LOG_ENTRIES);
    }
    this._pendingPush.push(entry);
    this._notify();
  }

  // ── Internal: Add API call ───────────────────────────────────────────────
  _addApiCall(entry) {
    // Skip log push calls to avoid recursion
    if (entry.fullUrl?.includes('/api/logs/ui') && entry.method === 'POST') return;

    this._apiCalls.push({ ...entry, transactionId: this._sessionTxId });
    if (this._apiCalls.length > MAX_API_ENTRIES) {
      this._apiCalls = this._apiCalls.slice(-MAX_API_ENTRIES);
    }
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
    const match = message.match(SOURCE_REGEX);
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
