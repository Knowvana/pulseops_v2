// ============================================================================
// RightLogsView — PulseOps V2 Layout
//
// PURPOSE: Right slide-out panel for system monitoring. Displays real-time
// logs and API calls in a tabbed interface. Toggles open/closed from the
// top nav bar monitor button.
//
// ARCHITECTURE: Stateful component managing tab selection and log display.
// All text from uiElementsText.json. Follows V1 RightPanel design with V2 theming.
// Logs rendered as structured JSON entries in a single scrollable area.
//
// USED BY: AppShell.jsx
//
// DEPENDENCIES:
//   - @config/uiElementsText.json → UI labels
//   - lucide-react            → Icons
// ============================================================================
import React, { useState, useRef, useEffect } from 'react';
import {
  X, ScrollText, Globe, Trash2, ChevronDown, ChevronRight, Copy, Check,
  Bug, Info, AlertTriangle, AlertCircle
} from 'lucide-react';
import uiText from '@config/uiElementsText.json';

const panelText = uiText.rightPanel;
const logText = panelText.logs;
const apiText = panelText.apiCalls;

const LOG_LEVEL_CONFIG = {
  debug: { icon: Bug, color: 'text-surface-400', bg: 'bg-surface-50', border: 'border-surface-200', dot: 'bg-surface-400' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50/50', border: 'border-blue-100', dot: 'bg-blue-500' },
  warn: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50/50', border: 'border-amber-100', dot: 'bg-amber-500' },
  error: { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50/50', border: 'border-rose-100', dot: 'bg-rose-500' },
};

const STATUS_COLOR = (s) =>
  s >= 500 ? 'text-rose-600' : s >= 400 ? 'text-amber-600' : s >= 200 ? 'text-emerald-600' : 'text-surface-400';

const FILTER_OPTIONS = [
  { id: 'all', label: logText.filterAll },
  { id: 'debug', label: logText.filterDebug },
  { id: 'info', label: logText.filterInfo },
  { id: 'warn', label: logText.filterWarn },
  { id: 'error', label: logText.filterError },
];

// ── JSON Detail Collapsible Component ──────────────────────────────────────
// Font sizes: Button label = text-[10px], JSON content = text-xs (12px)
// Height: max-h-64 (16rem / 256px)
function JsonDetail({ data, label }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  let formatted;
  try {
    formatted = typeof data === 'object' ? JSON.stringify(data, null, 2) : JSON.stringify(JSON.parse(data), null, 2);
  } catch {
    formatted = String(data);
  }
  return (
    <div className="mt-1">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-0.5 text-[10px] font-medium text-brand-500 hover:text-brand-700"
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        {label || 'Details'}
      </button>
      {open && (
        <pre className="mt-1 p-1.5 rounded bg-surface-100 border border-surface-200 text-xs font-mono text-surface-600 whitespace-pre-wrap break-all max-h-64 overflow-auto">
          {formatted}
        </pre>
      )}
    </div>
  );
}

// ── Log Entry Card Component ───────────────────────────────────────────────
// Font sizes:
//   - Level badge (INFO/WARN/etc): text-[11px]
//   - Source label: text-[11px]
//   - Timestamp: text-[10px]
//   - Message text: text-xs (12px)
//   - Transaction ID: text-[9px]
function LogEntryCard({ log }) {
  const cfg = LOG_LEVEL_CONFIG[log.level] || LOG_LEVEL_CONFIG.debug;
  const logJson = {
    time: log.timestamp,
    level: log.level,
    txId: log.transactionId || undefined,
    source: log.source || log.module || 'UI',
    message: log.message,
    ...(log.data ? { data: log.data } : {}),
  };

  return (
    <div className={`rounded-md border ${cfg.border} ${cfg.bg} px-2 py-1.5`}>
      <div className="flex items-start gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <span className={`text-[11px] font-bold uppercase ${cfg.color}`}>{log.level}</span>
              <span className="text-[11px] text-surface-400">{log.source || log.module || 'UI'}</span>
            </div>
            <span className="text-[10px] text-surface-400 shrink-0">{log.timestamp}</span>
          </div>
          <p className="text-xs text-surface-700 mt-0.5 break-words leading-snug">{log.message}</p>
          {log.transactionId && (
            <span className="inline-block mt-0.5 text-[9px] font-mono text-surface-400 bg-surface-100 px-1 rounded">
              TX: {log.transactionId}
            </span>
          )}
          <JsonDetail data={logJson} label="View JSON" />
        </div>
      </div>
    </div>
  );
}

// ── API Call Card Component ────────────────────────────────────────────────
// Font sizes:
//   - Method badge (GET/POST/etc): text-[11px]
//   - URL: text-xs (12px)
//   - Status code: text-xs (12px)
//   - Duration/TX/Error: text-[9px]
function ApiCallCard({ call }) {
  const isSuccess = call.status >= 200 && call.status < 300;
  const callJson = {
    time: call.timestamp,
    method: call.method,
    url: call.url,
    status: call.status,
    duration: call.duration ? `${call.duration}ms` : undefined,
    txId: call.transactionId || undefined,
    ...(call.error ? { error: call.error } : {}),
  };

  return (
    <div className={`rounded-md border px-2 py-1.5 ${isSuccess ? 'border-emerald-100 bg-emerald-50/30' : 'border-rose-100 bg-rose-50/30'}`}>
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-[11px] font-bold px-1 py-0.5 rounded ${
            isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>{call.method}</span>
          <span className="text-xs text-surface-600 truncate">{call.url}</span>
        </div>
        <span className={`text-xs font-bold shrink-0 ${STATUS_COLOR(call.status)}`}>{call.status || '—'}</span>
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        {call.duration && <span className="text-[9px] text-surface-400">{call.duration}ms</span>}
        {call.transactionId && (
          <span className="text-[9px] font-mono text-surface-400 bg-surface-100 px-1 rounded">
            TX: {call.transactionId}
          </span>
        )}
        {call.error && <span className="text-[9px] text-rose-500 truncate">{call.error}</span>}
      </div>
      <JsonDetail data={callJson} label="View JSON" />
    </div>
  );
}

export default function RightLogsView({ isOpen, onClose, logs = [], apiCalls = [], onClearLogs, onClearApiCalls }) {
  const [activeTab, setActiveTab] = useState('logs');
  const [logFilter, setLogFilter] = useState('all');
  const [copied, setCopied] = useState(false);
  const logsEndRef = useRef(null);

  const filteredLogs = logFilter === 'all'
    ? logs
    : logs.filter(log => log.level === logFilter);

  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs.length, isOpen]);

  const handleCopyAll = () => {
    const data = activeTab === 'logs' ? filteredLogs : apiCalls;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  return (
    <div
      className={`flex-shrink-0 bg-white border-l border-surface-200 shadow-xl flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
        isOpen ? 'w-[var(--right-panel-width)]' : 'w-0 border-l-0'
      }`}
    >
      {/* Header - Tab labels and counts */}
      {/* Font sizes: Tab labels = text-xs (12px), Count badges = text-[9px] */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface-200 flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'logs'
                ? 'bg-brand-50 text-brand-700'
                : 'text-surface-400 hover:text-surface-600 hover:bg-surface-50'
            }`}
          >
            <div className="flex items-center gap-1">
              <ScrollText size={12} />
              {panelText.tabs.systemLogs}
              {filteredLogs.length > 0 && (
                <span className="ml-0.5 px-1 py-0 rounded-full text-[9px] bg-brand-100 text-brand-600">{filteredLogs.length}</span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'api'
                ? 'bg-brand-50 text-brand-700'
                : 'text-surface-400 hover:text-surface-600 hover:bg-surface-50'
            }`}
          >
            <div className="flex items-center gap-1">
              <Globe size={12} />
              {panelText.tabs.apiCalls}
              {apiCalls.length > 0 && (
                <span className="ml-0.5 px-1 py-0 rounded-full text-[9px] bg-brand-100 text-brand-600">{apiCalls.length}</span>
              )}
            </div>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyAll}
            title="Copy all as JSON"
            className="p-1 rounded text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Log Filter Bar (only for logs tab) */}
      {/* Font size: Filter buttons (ALL/DEBUG/INFO/WARN/ERROR) = text-xs (12px) */}
      {activeTab === 'logs' && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-surface-100 bg-surface-50 flex-shrink-0">
          {FILTER_OPTIONS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setLogFilter(filter.id)}
              className={`px-1.5 py-0.5 rounded text-xs font-bold uppercase transition-all ${
                logFilter === filter.id
                  ? 'bg-brand-100 text-brand-700'
                  : 'text-surface-400 hover:text-surface-600 hover:bg-surface-100'
              }`}
            >
              {filter.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={onClearLogs}
            title={logText.clearTooltip}
            className="p-0.5 rounded text-surface-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}

      {/* API Calls action bar */}
      {activeTab === 'api' && apiCalls.length > 0 && (
        <div className="flex items-center justify-end px-2 py-1.5 border-b border-surface-100 bg-surface-50 flex-shrink-0">
          <button
            onClick={onClearApiCalls}
            title="Clear API calls"
            className="p-0.5 rounded text-surface-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}

      {/* Content — single scrollable area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {activeTab === 'logs' && (
          <>
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ScrollText size={28} className="text-surface-300 mb-2" />
                <p className="text-xs font-medium text-surface-500">{logText.emptyMessage}</p>
                <p className="text-[10px] text-surface-400 mt-1">{logText.emptyHint}</p>
              </div>
            ) : (
              filteredLogs.map((log, idx) => <LogEntryCard key={idx} log={log} />)
            )}
            <div ref={logsEndRef} />
          </>
        )}

        {activeTab === 'api' && (
          <>
            {apiCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Globe size={28} className="text-surface-300 mb-2" />
                <p className="text-xs font-medium text-surface-500">{apiText.emptyMessage}</p>
                <p className="text-[10px] text-surface-400 mt-1">{apiText.emptyHint}</p>
              </div>
            ) : (
              apiCalls.map((call, idx) => <ApiCallCard key={idx} call={call} />)
            )}
          </>
        )}
      </div>
    </div>
  );
}
