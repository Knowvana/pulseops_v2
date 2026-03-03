// ============================================================================
// LogViewer — PulseOps V2 Shared Component
//
// PURPOSE: Enterprise log viewer grid with column sorting, resizing, pagination,
// level filters, search, and a slide-out detail panel. Supports both UI and
// API log schemas. No page-level scrollbar — grid has its own scrollbars.
//
// ARCHITECTURE: All text from uiElementsText.json. No hardcoded strings.
// ============================================================================
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  X, FileJson, AlertCircle, Info, AlertTriangle, Bug, ChevronsUpDown,
} from 'lucide-react';
import uiText from '@config/uiElementsText.json';

const logText = uiText.coreViews.logs;
const gridText = logText.grid;
const detailText = logText.detail;
const filterText = logText.filters;
const paginationText = logText.pagination;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatIST(isoString) {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

const LEVEL_STYLES = {
  debug: { bg: 'bg-surface-100', text: 'text-surface-600', icon: Bug, border: 'border-surface-300' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Info, border: 'border-blue-200' },
  warn: { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertTriangle, border: 'border-amber-200' },
  error: { bg: 'bg-red-50', text: 'text-red-700', icon: AlertCircle, border: 'border-red-200' },
};

function LevelBadge({ level }) {
  const style = LEVEL_STYLES[level] || LEVEL_STYLES.info;
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${style.bg} ${style.text} border ${style.border}`}>
      <Icon size={10} />
      {level}
    </span>
  );
}

function MethodBadge({ method }) {
  const colors = {
    GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    POST: 'bg-blue-50 text-blue-700 border-blue-200',
    PUT: 'bg-amber-50 text-amber-700 border-amber-200',
    PATCH: 'bg-orange-50 text-orange-700 border-orange-200',
    DELETE: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${colors[method] || 'bg-surface-50 text-surface-600 border-surface-200'}`}>
      {method}
    </span>
  );
}

function StatusBadge({ code }) {
  if (!code) return <span className="text-xs text-surface-400">—</span>;
  const color = code >= 500 ? 'text-red-600' : code >= 400 ? 'text-amber-600' : 'text-emerald-600';
  return <span className={`text-xs font-bold ${color}`}>{code}</span>;
}

// ── UI Log Columns ───────────────────────────────────────────────────────────

const UI_COLUMNS = [
  { id: 'timestamp', label: gridText.time, width: 180, sortable: true, render: (row) => formatIST(row.timestamp || row.created_at) },
  { id: 'level', label: gridText.logLevel, width: 90, sortable: true, render: (row) => <LevelBadge level={row.level || row.log_level} /> },
  { id: 'source', label: gridText.source, width: 60, sortable: true, render: (row) => <span className="text-xs font-medium text-surface-500">{row.source || 'UI'}</span> },
  { id: 'event', label: gridText.event, width: 140, sortable: true, render: (row) => <span className="text-xs text-surface-700 truncate">{row.event || '—'}</span> },
  { id: 'component', label: gridText.component, width: 140, sortable: true, render: (row) => <span className="text-xs text-surface-600 truncate">{row.component || '—'}</span> },
  { id: 'module', label: gridText.module, width: 100, sortable: true, render: (row) => <span className="text-xs text-surface-500">{row.module || row.log_module || 'Core'}</span> },
  { id: 'user', label: gridText.user, width: 130, sortable: true, render: (row) => <span className="text-xs text-surface-600 truncate">{row.user || row.user_name || '—'}</span> },
  { id: 'message', label: gridText.message, width: 300, sortable: false, render: (row) => <span className="text-xs text-surface-700 truncate block">{row.message || '—'}</span> },
  { id: 'result', label: gridText.result, width: 120, sortable: false, render: (row) => <span className="text-xs text-surface-500 truncate">{row.result || '—'}</span> },
  { id: 'transactionId', label: gridText.transactionId, width: 200, sortable: true, render: (row) => <span className="text-[10px] font-mono text-surface-400 truncate">{row.transactionId || row.transaction_id || '—'}</span> },
];

// ── API Log Columns ──────────────────────────────────────────────────────────

const API_COLUMNS = [
  { id: 'timestamp', label: gridText.time, width: 180, sortable: true, render: (row) => formatIST(row.timestamp || row.created_at) },
  { id: 'level', label: gridText.logLevel, width: 90, sortable: true, render: (row) => <LevelBadge level={row.level || row.log_level} /> },
  { id: 'user', label: gridText.user, width: 130, sortable: true, render: (row) => <span className="text-xs text-surface-600 truncate">{row.user || row.user_name || '—'}</span> },
  { id: 'source', label: gridText.source, width: 60, sortable: true, render: (row) => <span className="text-xs font-medium text-surface-500">{row.source || 'API'}</span> },
  { id: 'method', label: gridText.method, width: 80, sortable: true, render: (row) => row.method ? <MethodBadge method={row.method} /> : <span className="text-xs text-surface-400">—</span> },
  { id: 'url', label: gridText.apiUrl, width: 260, sortable: true, render: (row) => <span className="text-xs font-mono text-surface-600 truncate block">{row.url || row.api_url || '—'}</span> },
  { id: 'statusCode', label: gridText.statusCode, width: 70, sortable: true, render: (row) => <StatusBadge code={row.statusCode || row.status_code} /> },
  { id: 'responseTime', label: gridText.responseTime, width: 110, sortable: true, render: (row) => { const t = row.responseTime || row.response_time_ms; return t ? <span className="text-xs text-surface-600">{t}ms</span> : <span className="text-xs text-surface-400">—</span>; } },
  { id: 'error', label: gridText.error, width: 200, sortable: false, render: (row) => <span className="text-xs text-danger-600 truncate block">{row.error || '—'}</span> },
  { id: 'module', label: gridText.module, width: 100, sortable: true, render: (row) => <span className="text-xs text-surface-500">{row.module || row.log_module || 'Core'}</span> },
  { id: 'transactionId', label: gridText.transactionId, width: 200, sortable: true, render: (row) => <span className="text-[10px] font-mono text-surface-400 truncate">{row.transactionId || row.transaction_id || '—'}</span> },
];

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

// ── Detail Panel ─────────────────────────────────────────────────────────────

function LogDetailPanel({ log, logType, onClose }) {
  if (!log) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-surface-400 italic px-4">
        {detailText.noSelection}
      </div>
    );
  }

  const isApi = logType === 'api';

  const renderJsonBlock = (label, data) => {
    if (!data) return null;
    let formatted;
    try {
      formatted = typeof data === 'string' ? JSON.stringify(JSON.parse(data), null, 2) : JSON.stringify(data, null, 2);
    } catch {
      formatted = String(data);
    }
    return (
      <div>
        <h4 className="text-xs font-bold text-surface-600 mb-1">{label}</h4>
        <div className="bg-surface-50 rounded-lg border border-surface-200 p-3 max-h-64 overflow-auto">
          <pre className="text-[11px] font-mono text-surface-700 whitespace-pre-wrap break-all">{formatted}</pre>
        </div>
      </div>
    );
  };

  const renderField = (label, value) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-surface-100 last:border-b-0">
      <span className="text-xs font-medium text-surface-500 w-28 flex-shrink-0">{label}</span>
      <span className="text-xs text-surface-800 break-all">{value || '—'}</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 bg-gradient-to-r from-brand-50 to-white">
        <h3 className="text-sm font-bold text-surface-800">{detailText.title}</h3>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100 transition-colors">
          <X size={16} className="text-surface-500" />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {renderField(detailText.transactionId, log.transactionId || log.transaction_id)}
        {renderField(detailText.timestamp, formatIST(log.timestamp || log.created_at))}
        {renderField(detailText.level, log.level || log.log_level)}
        {renderField(detailText.source, log.source)}
        {renderField(detailText.user, log.user || log.user_name)}
        {renderField(detailText.module, log.module || log.log_module)}

        {isApi && (
          <>
            {renderField(detailText.url, log.url || log.api_url)}
            {renderField(detailText.method, log.method)}
            {renderField(detailText.statusCode, log.statusCode || log.status_code)}
            {renderField(detailText.responseTime, (log.responseTime || log.response_time_ms) ? `${log.responseTime || log.response_time_ms}ms` : null)}
          </>
        )}

        {!isApi && (
          <>
            {renderField(detailText.event, log.event)}
            {renderField(detailText.component, log.component)}
            {renderField(detailText.message, log.message)}
            {renderField(detailText.result, log.result)}
          </>
        )}
      </div>

      {/* JSON Blocks */}
      {isApi && (
        <div className="px-4 pb-4 space-y-3 overflow-y-auto max-h-[50%]">
          {renderJsonBlock(detailText.requestBody, log.requestBody || log.request_body)}
          {renderJsonBlock(detailText.responseBody, log.responseBody || log.response_body)}
        </div>
      )}
    </div>
  );
}

// ── Main LogViewer ───────────────────────────────────────────────────────────

export default function LogViewer({
  logs = [],
  logType = 'api',
  isLoading = false,
  totalCount = 0,
}) {
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [sortColumn, setSortColumn] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [columnWidths, setColumnWidths] = useState({});
  const gridRef = useRef(null);
  const resizingRef = useRef(null);

  const columns = logType === 'ui' ? UI_COLUMNS : API_COLUMNS;

  // Reset page when logs change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedLog(null);
    setShowDetail(false);
  }, [logType, logs.length]);

  // ── Sorting ────────────────────────────────────────────────────────────────
  const sortedLogs = useMemo(() => {
    if (!sortColumn) return logs;
    const col = columns.find(c => c.id === sortColumn);
    if (!col?.sortable) return logs;

    return [...logs].sort((a, b) => {
      let aVal = a[sortColumn] || a[sortColumn.replace(/([A-Z])/g, '_$1').toLowerCase()] || '';
      let bVal = b[sortColumn] || b[sortColumn.replace(/([A-Z])/g, '_$1').toLowerCase()] || '';
      if (sortColumn === 'timestamp') {
        aVal = new Date(a.timestamp || a.created_at || 0).getTime();
        bVal = new Date(b.timestamp || b.created_at || 0).getTime();
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [logs, sortColumn, sortDirection, columns]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedLogs.slice(start, start + pageSize);
  }, [sortedLogs, currentPage, pageSize]);

  const handleSort = useCallback((colId) => {
    if (sortColumn === colId) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(colId);
      setSortDirection('desc');
    }
  }, [sortColumn]);

  const handleRowClick = useCallback((log) => {
    setSelectedLog(log);
    setShowDetail(true);
  }, []);

  // ── Column Resizing ────────────────────────────────────────────────────────
  const handleResizeStart = useCallback((e, colId, defaultWidth) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[colId] || defaultWidth;

    const handleMouseMove = (moveEvent) => {
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [colId]: newWidth }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const noLogs = !isLoading && paginatedLogs.length === 0;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden rounded-xl border border-surface-200 bg-white shadow-sm">
      {/* Grid Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Grid */}
        <div className="flex-1 overflow-auto" ref={gridRef}>
          <table className="w-full border-collapse text-left min-w-max">
            {/* Header */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-r from-surface-50 to-surface-100 border-b border-surface-200">
                {columns.map((col) => {
                  const width = columnWidths[col.id] || col.width;
                  const isSorted = sortColumn === col.id;
                  return (
                    <th
                      key={col.id}
                      style={{ width, minWidth: width, maxWidth: width }}
                      className="relative px-3 py-2.5 text-xs font-bold text-surface-600 uppercase tracking-wide select-none"
                    >
                      <div
                        className={`flex items-center gap-1 ${col.sortable ? 'cursor-pointer hover:text-brand-600' : ''}`}
                        onClick={() => col.sortable && handleSort(col.id)}
                      >
                        <span className="truncate">{col.label}</span>
                        {col.sortable && (
                          <span className="flex-shrink-0">
                            {isSorted ? (
                              sortDirection === 'asc' ? <ChevronUp size={12} className="text-brand-500" /> : <ChevronDown size={12} className="text-brand-500" />
                            ) : (
                              <ChevronsUpDown size={12} className="text-surface-300" />
                            )}
                          </span>
                        )}
                      </div>
                      {/* Resize Handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-brand-300 transition-colors"
                        onMouseDown={(e) => handleResizeStart(e, col.id, col.width)}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={columns.length} className="py-16">
                    <div className="sticky left-0 w-[calc(100vw-320px)] flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-surface-400">{uiText.coreViews.logs.stats.refreshNow}...</span>
                    </div>
                  </td>
                </tr>
              )}

              {noLogs && (
                <tr>
                  <td colSpan={columns.length} className="py-16">
                    <div className="sticky left-0 w-[calc(100vw-320px)] flex flex-col items-center justify-center gap-2">
                      <FileJson size={32} className="text-surface-300" />
                      <span className="text-sm font-medium text-surface-500">{logText.stats.noLogs}</span>
                      <span className="text-xs text-surface-400">{logText.stats.noLogsHint}</span>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && paginatedLogs.map((log, index) => {
                const isSelected = selectedLog === log;
                const level = log.level || log.log_level || 'info';
                const rowBg = level === 'error' ? 'bg-red-50/40' : level === 'warn' ? 'bg-amber-50/30' : '';

                return (
                  <tr
                    key={log.id || log.transaction_id || log.transactionId || index}
                    onClick={() => handleRowClick(log)}
                    className={`border-b border-surface-100 cursor-pointer transition-colors
                      ${isSelected ? 'bg-brand-50 border-l-2 border-l-brand-400' : `${rowBg} hover:bg-surface-50`}`}
                  >
                    {columns.map((col) => {
                      const width = columnWidths[col.id] || col.width;
                      return (
                        <td
                          key={col.id}
                          style={{ width, minWidth: width, maxWidth: width }}
                          className="px-3 py-2 overflow-hidden"
                        >
                          {col.render(log)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-surface-200 bg-surface-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-500">{paginationText.pageSize}:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="text-xs border border-surface-200 rounded px-2 py-1 bg-white text-surface-700 focus:outline-none focus:ring-1 focus:ring-brand-300"
            >
              {PAGE_SIZE_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-surface-500">
              {paginationText.page} {currentPage} {paginationText.of} {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-surface-200 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={14} className="text-surface-600" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-surface-200 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={14} className="text-surface-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Panel (slide-out right) */}
      {showDetail && (
        <div className="w-80 flex-shrink-0 border-l border-surface-200 bg-white overflow-hidden">
          <LogDetailPanel
            log={selectedLog}
            logType={logType}
            onClose={() => { setShowDetail(false); setSelectedLog(null); }}
          />
        </div>
      )}
    </div>
  );
}
