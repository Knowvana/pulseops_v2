// ============================================================================
// LogStats — PulseOps V2 Shared Component
//
// PURPOSE: Reusable stats bar for log viewer and logging configuration pages.
// Shows log source (File/DB), last sync time, entry count, refresh & delete.
//
// USAGE:
//   <LogStats
//     storage="file"
//     count={123}
//     lastSync="2026-03-03T08:15:08.191Z"
//     onRefresh={() => {}}
//     onDelete={() => {}}
//     isLoading={false}
//   />
//
// ARCHITECTURE: All text from uiElementsText.json. No hardcoded strings.
// ============================================================================
import React from 'react';
import { Database, FileText, RefreshCw, Trash2, Clock, Hash } from 'lucide-react';
import uiText from '@config/uiElementsText.json';

const statsText = uiText.coreViews.logs.stats;

function formatTime(isoString) {
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

export default function LogStats({
  storage = 'file',
  count = 0,
  lastSync = null,
  onRefresh,
  onDelete,
  isLoading = false,
  compact = false,
}) {
  const isFile = storage === 'file';
  const SourceIcon = isFile ? FileText : Database;
  const sourceLabel = isFile ? statsText.file : statsText.database;

  return (
    <div className={`flex flex-wrap items-center gap-3 ${compact ? 'gap-2' : 'gap-3'}`}>
      {/* Log Source */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 border border-surface-200">
        <SourceIcon size={14} className={isFile ? 'text-amber-500' : 'text-brand-500'} />
        <span className="text-xs font-medium text-surface-500">{statsText.logSource}:</span>
        <span className={`text-xs font-bold ${isFile ? 'text-amber-600' : 'text-brand-600'}`}>{sourceLabel}</span>
      </div>

      {/* Last Sync */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 border border-surface-200">
        <Clock size={14} className="text-surface-400" />
        <span className="text-xs font-medium text-surface-500">{statsText.lastSync}:</span>
        <span className="text-xs font-bold text-surface-700">{formatTime(lastSync)}</span>
      </div>

      {/* Entry Count */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-50 border border-surface-200">
        <Hash size={14} className="text-surface-400" />
        <span className="text-xs font-medium text-surface-500">{statsText.logEntries}:</span>
        <span className="text-xs font-bold text-surface-700">{count.toLocaleString()}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Refresh */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-600 bg-brand-50 border border-brand-200 hover:bg-brand-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          {statsText.refreshNow}
        </button>
      )}

      {/* Delete */}
      {onDelete && (
        <button
          onClick={onDelete}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-danger-600 bg-danger-50 border border-danger-200 hover:bg-danger-100 transition-colors disabled:opacity-50"
        >
          <Trash2 size={13} />
          {statsText.deleteLogs}
        </button>
      )}
    </div>
  );
}
