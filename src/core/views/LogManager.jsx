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
import React, { useState, useEffect, useCallback } from 'react';
import { ScrollText, Search, Monitor, Server } from 'lucide-react';
import { LogViewer, LogStats, ConfirmationModal } from '@shared';
import uiText from '@config/uiElementsText.json';
import uiMessages from '@config/UIMessages.json';
import urls from '@config/urls.json';

const viewText = uiText.coreViews.logs;
const filterText = viewText.filters;
const logTypeText = viewText.logTypes;
// urls.logs.* paths already include /api prefix (e.g. /api/logs/api)
// Vite proxy forwards /api/* to backend - use empty base to avoid double /api/api
const apiBase = '';

const LEVEL_FILTERS = ['all', 'debug', 'info', 'warn', 'error'];

export default function LogManager() {
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

  // ── Fetch Logs ───────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (levelFilter !== 'all') params.set('level', levelFilter);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      params.set('limit', '500');

      const endpoint = logType === 'ui' ? urls.logs.ui : urls.logs.api;
      const res = await fetch(`${apiBase}${endpoint}?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.logs || []);
      } else {
        setLogs([]);
      }
    } catch {
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [logType, levelFilter, debouncedSearch]);

  // ── Fetch Stats ──────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const endpoint = logType === 'ui' ? urls.logs.uiStats : urls.logs.apiStats;
      const res = await fetch(`${apiBase}${endpoint}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch {
      // Keep existing stats on error
    }
  }, [logType]);

  // ── Fetch log config (datasource details) ─────────────────────────────────
  const fetchLogConfig = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}${urls.logs.config}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setLogConfig(json.data);
    } catch { /* keep null */ }
  }, []);

  // ── Auto-fetch on mount and when filters change ──────────────────────────
  useEffect(() => {
    fetchLogs();
    fetchStats();
    fetchLogConfig();
  }, [fetchLogs, fetchStats, fetchLogConfig]);

  // ── Refresh handler ──────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

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
    } catch {
      // Silently fail — stats will show current state on next refresh
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

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-3 flex-shrink-0 mb-3">
        {/* Log Type Selector */}
        <div className="flex items-center rounded-lg border border-surface-200 overflow-hidden bg-white shadow-sm">
          <button
            onClick={() => setLogType('ui')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium transition-colors
              ${logType === 'ui' ? 'bg-brand-500 text-white' : 'text-surface-600 hover:bg-surface-50'}`}
          >
            <Monitor size={13} />
            {logTypeText.ui}
          </button>
          <button
            onClick={() => setLogType('api')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium transition-colors
              ${logType === 'api' ? 'bg-brand-500 text-white' : 'text-surface-600 hover:bg-surface-50'}`}
          >
            <Server size={13} />
            {logTypeText.api}
          </button>
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-1">
          {LEVEL_FILTERS.map(level => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors border
                ${levelFilter === level
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50 hover:border-surface-300'}`}
            >
              {filterText[level]}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={viewText.search.placeholder}
            className="w-full pl-8 pr-3 py-2 text-xs border border-surface-200 rounded-lg bg-white text-surface-700 placeholder:text-surface-400 focus:outline-none focus:ring-1 focus:ring-brand-300 focus:border-brand-300"
          />
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

      {/* Log Grid + Detail Panel */}
      <LogViewer
        logs={logs}
        logType={logType}
        isLoading={isLoading}
        totalCount={stats.count}
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
