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
import { ScrollText } from 'lucide-react';
import { LogViewer, LogStats, ConfirmationModal } from '@shared';
import uiText from '@config/uiElementsText.json';
import uiMessages from '@config/UIMessages.json';
import urls from '@config/urls.json';

const viewText = uiText.coreViews.logs;
const logTypeText = viewText.logTypes;
// urls.logs.* paths already include /api prefix (e.g. /api/logs/api)
// Vite proxy forwards /api/* to backend - use empty base to avoid double /api/api
const apiBase = '';

export default function LogManager() {
  // ── StrictMode-safe refs ─────────────────────────────────────────────────
  const mountRan = useRef(false);    // Prevents double-mount fetch in React StrictMode
  const filterInit = useRef(false);  // Skips initial render in filter-change effect
  const statsInit = useRef(false);   // Skips initial render in stats-change effect

  // ── State ────────────────────────────────────────────────────────────────
  const [logType, setLogType] = useState('api');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ storage: 'file', count: 0, lastSync: null });
  const [isLoading, setIsLoading] = useState(false);
  const [levelFilter, setLevelFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [logConfig, setLogConfig] = useState(null);

  // ── Search debounce ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Fetch functions (stable refs — read logType/filters from closure) ────
  const fetchLogs = useCallback(async (type, level, search) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (level !== 'all') params.set('level', level);
      if (search?.trim()) params.set('search', search.trim());
      params.set('limit', '500');
      const endpoint = type === 'ui' ? urls.logs.ui : urls.logs.api;
      const res = await fetch(`${apiBase}${endpoint}?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.logs || []);
      } else {
        setLogs([]);
        console.warn('⚠️ [LogManager] Logs fetch returned unsuccessful response');
      }
    } catch (err) {
      setLogs([]);
      console.error('❌ [LogManager] Failed to fetch logs:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async (type) => {
    try {
      const endpoint = type === 'ui' ? urls.logs.uiStats : urls.logs.apiStats;
      const res = await fetch(`${apiBase}${endpoint}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch { /* keep existing stats on error */ }
  }, []);

  const fetchLogConfig = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}${urls.logs.settings}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setLogConfig(json.data);
    } catch { /* keep null */ }
  }, []);

  // ── Effect 1: Mount once (StrictMode-safe) — log access + initial fetch ──
  useEffect(() => {
    if (mountRan.current) return;
    mountRan.current = true;
    console.log('📋 [LogManager] Log Manager page accessed');
    fetchLogConfig();
    fetchLogs('api', 'all', '');
    fetchStats('api');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: Re-fetch logs only when filters or logType change ──────────
  useEffect(() => {
    if (!filterInit.current) { filterInit.current = true; return; }
    fetchLogs(logType, levelFilter, debouncedSearch);
  }, [logType, levelFilter, debouncedSearch, fetchLogs]);

  // ── Effect 3: Re-fetch stats only when logType changes ───────────────────
  useEffect(() => {
    if (!statsInit.current) { statsInit.current = true; return; }
    fetchStats(logType);
  }, [logType, fetchStats]);

  // ── Refresh handler ──────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    fetchLogs(logType, levelFilter, debouncedSearch);
    fetchStats(logType);
  }, [logType, levelFilter, debouncedSearch, fetchLogs, fetchStats]);

  // ── Delete handler ─────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      const endpoint = logType === 'ui' ? urls.logs.ui : urls.logs.api;
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setLogs([]);
        setStats(prev => ({ ...prev, count: 0 }));
      }
    } catch (err) {
      console.error('❌ [LogManager] Failed to delete logs:', err.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [logType]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full animate-fade-in overflow-hidden">
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
        const dsName = isFile
          ? (logType === 'ui'
            ? (logConfig?.file?.uiLogsPath || 'logs/ui-logs.json')
            : (logConfig?.file?.apiLogsPath || 'logs/api-logs.json'))
          : (logType === 'ui'
            ? (logConfig?.database?.uiLogsTable || 'system_ui_logs')
            : (logConfig?.database?.apiLogsTable || 'system_api_logs'));
        const entryCount = stats.count || 0;

        return (
          <ConfirmationModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            title={viewText.stats.deleteConfirmTitle}
            actionDescription={`delete all ${logType === 'ui' ? logTypeText.ui : logTypeText.api} permanently`}
            actionTarget="Log Datasource"
            actionDetails={[
              { label: 'DataSource', value: `${dsType} (${dsName})` },
              { label: 'Entries to be Deleted', value: String(entryCount) },
            ]}
            confirmLabel={viewText.stats.deleteButton}
            action={handleDelete}
            onSuccess={() => { fetchLogs(); fetchStats(); }}
            variant="danger"
            buildSummary={(result) => [
              { label: 'Log Type', value: logType === 'ui' ? logTypeText.ui : logTypeText.api },
              { label: 'DataSource', value: `${dsType} (${dsName})` },
              { label: 'Entries Deleted', value: String(result?.deleted ?? entryCount) },
              { label: 'Status', value: 'All logs deleted successfully' },
            ]}
          />
        );
      })()}
    </div>
  );
}
