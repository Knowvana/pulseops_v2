// ============================================================================
// LogManager — PulseOps V2 Core
//
// PURPOSE: Native core view for viewing real-time platform logs, API calls,
// and system diagnostics. This is NOT a dynamic module — it is a hard-routed
// core view.
//
// FEATURES:
//   - Log type selector (UI Logs / API Logs)
//   - Search bar + level filters (All, Debug, Info, Warn, Error)
//   - Stats bar showing log source, last sync, entry count
//   - Enterprise grid with sorting, column resizing, pagination
//   - Slide-out detail panel with formatted JSON for request/response
//   - Refresh and delete-all actions with confirmation
//   - No page-level scrollbar — only grid + detail panel scroll
//
// ROUTE: /logs
//
// ARCHITECTURE: Reads all text from uiElementsText.json. Uses shared components
// exclusively. No inline hardcoded strings.
//
// DEPENDENCIES:
//   - @config/uiElementsText.json → All UI labels
//   - @config/UIMessages.json     → Success/error messages
//   - @config/urls.json           → API endpoints
//   - @shared → LogViewer, LogStats, ConfirmationModal
// ============================================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScrollText, AlertTriangle, Settings as SettingsIcon } from 'lucide-react';
import { LogViewer, LogStats, ConfirmationModal, createLogger } from '@shared';
import uiText from '@config/uiElementsText.json';
import uiMessages from '@config/UIMessages.json';
import urls from '@config/urls.json';

const log = createLogger('LogManager.jsx');

const viewText = uiText.coreViews.logs;
const logTypeText = viewText.logTypes;
// urls.logs.* paths already include /api prefix (e.g. /api/logs/api)
// Vite proxy forwards /api/* to backend - use empty base to avoid double /api/api
const apiBase = '';

export default function LogManager() {
  const navigate = useNavigate();
  // ── StrictMode-safe refs ─────────────────────────────────────────────────
  const mountRan = useRef(false);    // Prevents double-mount fetch in React StrictMode
  const ready = useRef(false);       // True after initial fetch completes — gates Effects 2+

  // ── State ────────────────────────────────────────────────────────────────
  const [logType, setLogType] = useState('api');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ storage: 'file', count: 0, lastSync: null });
  const [isLoading, setIsLoading] = useState(false);
  const [levelFilter, setLevelFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logConfig, setLogConfig] = useState(null);
  // Search is pure client-side — LogViewer filters in-memory via useMemo.
  // No debounce or server-side search needed; eliminates per-keystroke API calls.

  // ── Fetch functions (stable refs) ──────────────────────────────────────────
  const fetchLogs = useCallback(async (type, level) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (level !== 'all') params.set('level', level);
      params.set('limit', '500');
      const endpoint = type === 'ui' ? urls.logs.ui : urls.logs.api;
      const res = await fetch(`${apiBase}${endpoint}?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.logs || []);
      } else {
        setLogs([]);
        log.warn('fetchLogs', 'Logs fetch returned unsuccessful response');
      }
    } catch (err) {
      setLogs([]);
      log.error('fetchLogs', 'Failed to fetch logs', { message: err.message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}${urls.logs.stats}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const total = (d.ui?.count || 0) + (d.api?.count || 0);
        setStats({
          storage: d.ui?.storage || d.api?.storage || 'file',
          count: total,
          lastSync: d.ui?.lastEntry || d.api?.lastEntry || d.ui?.lastModified || d.api?.lastModified || null,
        });
      }
    } catch { /* keep existing stats on error */ }
  }, []);

  const fetchLogConfig = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}${urls.logs.config}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setLogConfig(json.data);
    } catch { /* keep null */ }
  }, []);

  // ── Effect 1: Mount once (StrictMode-safe) — log access + initial fetch ──
  useEffect(() => {
    if (mountRan.current) return;
    mountRan.current = true;
    log.info('mount', 'Log Manager page accessed');
    fetchLogConfig();
    fetchLogs('api', 'all');
    fetchStats();
    // Mark ready after a tick so Effects 2+ skip the initial render cycle
    queueMicrotask(() => { ready.current = true; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: Re-fetch logs + stats when level filter or logType change ──
  // Search is NOT a dependency — it is handled client-side in LogViewer.
  useEffect(() => {
    if (!ready.current) return;
    fetchLogs(logType, levelFilter);
    fetchStats();
  }, [logType, levelFilter, fetchLogs, fetchStats]);

  // ── Refresh handler (async — returns promise for loading spinner) ────────
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setSearchTerm('');             // Clear search to get full fresh dataset
    try {
      await Promise.all([
        fetchLogs(logType, levelFilter),
        fetchStats(),
        fetchLogConfig(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [logType, levelFilter, fetchLogs, fetchStats, fetchLogConfig]);

  // ── Delete handler ─────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`${apiBase}${urls.logs.deleteAll}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      let uiDeleted = 0;
      let apiDeleted = 0;

      // Backward-compat: older API builds may not implement DELETE /logs
      if (res.status === 404) {
        const [uiRes, apiRes] = await Promise.all([
          fetch(`${apiBase}${urls.logs.ui}`, { method: 'DELETE', credentials: 'include' }),
          fetch(`${apiBase}${urls.logs.api}`, { method: 'DELETE', credentials: 'include' }),
        ]);

        const uiJson = await uiRes.json();
        const apiJson = await apiRes.json();
        if (!uiJson.success || !apiJson.success) {
          throw new Error(uiJson?.error?.message || apiJson?.error?.message || uiMessages?.logs?.deleteFailed || 'Failed to delete logs');
        }

        uiDeleted = uiJson?.data?.deleted ?? 0;
        apiDeleted = apiJson?.data?.deleted ?? 0;
      } else {
        const json = await res.json();
        if (!json.success) {
          throw new Error(json?.error?.message || uiMessages?.logs?.deleteFailed || 'Failed to delete logs');
        }

        uiDeleted = json?.data?.ui?.deleted ?? 0;
        apiDeleted = json?.data?.api?.deleted ?? 0;
      }

      const totalDeleted = uiDeleted + apiDeleted;

      setLogs([]);
      fetchStats();
      fetchLogs(logType, levelFilter);
      return { uiDeleted, apiDeleted, totalDeleted };
    } catch (err) {
      log.error('handleDelete', 'Failed to delete logs', { message: err.message });
      throw err;
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [logType, levelFilter, fetchLogs, fetchStats]);

  const logsDisabled = logConfig !== null && logConfig.enabled === false;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col h-full animate-fade-in overflow-hidden">
      {/* Logs Disabled Overlay */}
      {logsDisabled && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface-50/90 backdrop-blur-sm rounded-xl">
          <div className="bg-white border border-amber-200 rounded-2xl shadow-xl p-8 max-w-md mx-4 text-center space-y-4">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle size={28} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-surface-800 mb-1">Logs Not Enabled</h3>
              <p className="text-sm text-surface-500">
                Database logging is currently disabled. Enable it from
                {' '}<strong>Platform Admin → Settings → Log Configuration</strong>.
              </p>
            </div>
            <button
              onClick={() => navigate('/platform_admin/Settings')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white text-sm font-semibold rounded-xl hover:bg-brand-600 transition-colors"
            >
              <SettingsIcon size={15} />
              Go to Log Configuration
            </button>
          </div>
        </div>
      )}
      {/* Page Header */}
      <div className="flex items-center gap-3 flex-shrink-0 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center shadow-sm">
          <ScrollText size={20} className="text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-surface-800">{viewText.title}</h1>
          <p className="text-sm text-surface-500 mt-0.5">{viewText.subtitle}</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex-shrink-0 mb-3">
        <LogStats
          storage={stats.storage}
          count={stats.count}
          lastSync={stats.lastSync || stats.lastModified || stats.lastEntry}
          onRefresh={handleRefresh}
          onDelete={() => setShowDeleteConfirm(true)}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
        />
      </div>

      {/* Log Grid + Detail Panel (controls moved inside LogViewer) */}
      <LogViewer
        logs={logs}
        logType={logType}
        isLoading={isLoading}
        totalCount={stats.count}
        onLogTypeChange={setLogType}
        levelFilter={levelFilter}
        onLevelFilterChange={setLevelFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Delete Confirmation Modal */}
      {(() => {
        const isFile = stats.storage === 'file';
        const dsType = isFile ? 'JSON File' : 'Database';
        const dsUiName = isFile
          ? (logConfig?.file?.uiLogsPath || 'logs/ui-logs.json')
          : (logConfig?.database?.uiLogsTable || 'system_ui_logs');
        const dsApiName = isFile
          ? (logConfig?.file?.apiLogsPath || 'logs/api-logs.json')
          : (logConfig?.database?.apiLogsTable || 'system_api_logs');
        const entryCount = stats.count || 0;

        return (
          <ConfirmationModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            title={viewText.stats.deleteConfirmTitle}
            actionDescription={`delete all ${logTypeText.ui} and ${logTypeText.api} permanently`}
            actionTarget="Log Datasource"
            actionDetails={[
              { label: 'DataSource (UI)', value: `${dsType} (${dsUiName})` },
              { label: 'DataSource (API)', value: `${dsType} (${dsApiName})` },
              { label: 'Entries to be Deleted', value: String(entryCount) },
            ]}
            confirmLabel={viewText.stats.deleteButton}
            action={handleDelete}
            onSuccess={() => {
              fetchLogs(logType, levelFilter);
              fetchStats();
            }}
            variant="danger"
            buildSummary={(result) => [
              { label: 'Log Type', value: `${logTypeText.ui} + ${logTypeText.api}` },
              { label: 'DataSource (UI)', value: `${dsType} (${dsUiName})` },
              { label: 'DataSource (API)', value: `${dsType} (${dsApiName})` },
              { label: 'Entries Deleted', value: String(result?.totalDeleted ?? entryCount) },
              { label: 'Status', value: 'All logs deleted successfully' },
            ]}
          />
        );
      })()}
    </div>
  );
}
