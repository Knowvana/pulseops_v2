// ============================================================================
// RightLogsView — PulseOps V2 Layout
//
// PURPOSE: Right slide-out panel for system monitoring. Displays real-time
// logs and API calls in a tabbed interface. Toggles open/closed from the
// top nav bar monitor button.
//
// ARCHITECTURE: Stateful component managing tab selection and log display.
// All text from uiElementsText.json. Follows V1 RightPanel design with V2 theming.
//
// USED BY: AppShell.jsx
//
// DEPENDENCIES:
//   - @config/uiElementsText.json → UI labels
//   - lucide-react            → Icons
// ============================================================================
import React, { useState, useRef, useEffect } from 'react';
import {
  X, ScrollText, Globe, Trash2,
  Bug, Info, AlertTriangle, AlertCircle
} from 'lucide-react';
import uiText from '@config/uiElementsText.json';

const panelText = uiText.rightPanel;
const logText = panelText.logs;
const apiText = panelText.apiCalls;

const LOG_LEVEL_CONFIG = {
  debug: { icon: Bug, color: 'text-surface-400', bg: 'bg-surface-100', border: 'border-surface-200' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  warn: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
  error: { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200' },
};

const FILTER_OPTIONS = [
  { id: 'all', label: logText.filterAll },
  { id: 'debug', label: logText.filterDebug },
  { id: 'info', label: logText.filterInfo },
  { id: 'warn', label: logText.filterWarn },
  { id: 'error', label: logText.filterError },
];

export default function RightLogsView({ isOpen, onClose, logs = [], apiCalls = [], onClearLogs, onClearApiCalls }) {
  const [activeTab, setActiveTab] = useState('logs');
  const [logFilter, setLogFilter] = useState('all');
  const logsEndRef = useRef(null);

  const filteredLogs = logFilter === 'all'
    ? logs
    : logs.filter(log => log.level === logFilter);

  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs.length, isOpen]);

  return (
    <div
      className={`fixed top-[var(--topnav-height)] right-0 bottom-0 w-[var(--right-panel-width)] bg-white border-l border-surface-200 shadow-xl z-20 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'logs'
                ? 'bg-brand-50 text-brand-700'
                : 'text-surface-400 hover:text-surface-600 hover:bg-surface-50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ScrollText size={12} />
              {panelText.tabs.systemLogs}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'api'
                ? 'bg-brand-50 text-brand-700'
                : 'text-surface-400 hover:text-surface-600 hover:bg-surface-50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Globe size={12} />
              {panelText.tabs.apiCalls}
            </div>
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Log Filter Bar (only for logs tab) */}
      {activeTab === 'logs' && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-surface-100 bg-surface-50">
          {FILTER_OPTIONS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setLogFilter(filter.id)}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
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
            className="p-1 rounded text-surface-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5" style={{ height: 'calc(100% - 90px)' }}>
        {activeTab === 'logs' && (
          <>
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ScrollText size={28} className="text-surface-300 mb-2" />
                <p className="text-xs font-medium text-surface-500">{logText.emptyMessage}</p>
                <p className="text-[10px] text-surface-400 mt-1">{logText.emptyHint}</p>
              </div>
            ) : (
              <pre className="text-[10px] font-mono text-surface-700 whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(
                  filteredLogs.map(log => ({
                    time: log.timestamp,
                    level: log.level,
                    source: log.source || log.module || 'UI',
                    message: log.message,
                    transactionId: log.transactionId || undefined,
                    ...(log.data ? { data: log.data } : {}),
                  })),
                  null,
                  2
                )}
              </pre>
            )}
            <div ref={logsEndRef} />
          </>
        )}

        {activeTab === 'api' && (
          <>
            {apiCalls.length > 0 && (
              <div className="flex justify-end mb-1">
                <button
                  onClick={onClearApiCalls}
                  title="Clear API calls"
                  className="p-1 rounded text-surface-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
            {apiCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Globe size={28} className="text-surface-300 mb-2" />
                <p className="text-xs font-medium text-surface-500">{apiText.emptyMessage}</p>
                <p className="text-[10px] text-surface-400 mt-1">{apiText.emptyHint}</p>
              </div>
            ) : (
              <pre className="text-[10px] font-mono text-surface-700 whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(
                  apiCalls.map(call => ({
                    time: call.timestamp,
                    method: call.method,
                    url: call.url,
                    status: call.status,
                    duration: call.duration ? `${call.duration}ms` : undefined,
                    transactionId: call.transactionId || undefined,
                    ...(call.error ? { error: call.error } : {}),
                  })),
                  null,
                  2
                )}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
}
