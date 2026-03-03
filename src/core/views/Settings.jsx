// ============================================================================
// Settings — PulseOps V2 Core
//
// PURPOSE: Native core view for platform-wide settings. Uses ConfigLayout
// with vertical tabs for Database Config, Database Objects, Log Settings,
// Log Configuration, and Authentication Settings.
// This is NOT a dynamic module — it is a hard-routed core view.
//
// ROUTE: /settings
//
// ARCHITECTURE: Reads all text from uiText.json. Uses shared components
// (ConfigLayout, TestConnection, DatabaseManager, LoggingConfig, Button,
// ConfirmationModal) exclusively. No inline hardcoded strings.
//
// DEPENDENCIES:
//   - @config/uiText.json → All UI labels
//   - @config/urls.json       → API endpoints
//   - @config/app.json        → App metadata
//   - @shared → ConfigLayout, TestConnection, DatabaseManager, LoggingConfig,
//               Button, ConfirmationModal, ConnectionStatus
// ============================================================================
import React, { useState, useCallback, useEffect } from 'react';
import {
  Settings as SettingsIcon, Database, Layers, FileText, ScrollText,
  Shield, Globe, AlertTriangle, RefreshCw, Check
} from 'lucide-react';
import { ConfigLayout, TestConnection, DatabaseManager, LoggingConfig, Button, ConfirmationModal, ConnectionStatus } from '@shared';
import uiText from '@config/uiElementsText.json';
import urls from '@config/urls.json';

const viewText = uiText.coreViews.settings;
const tabText = viewText.tabs;
const logText = viewText.logSettings;
const authText = viewText.authSettings;
const connectionText = viewText.connectionStatus;

// ── Database Configuration Tab ──────────────────────────────────────────────
function DatabaseConfigTab() {
  const dbFields = [
    { name: 'host', label: 'Host', placeholder: 'localhost', type: 'text', defaultValue: 'localhost' },
    { name: 'port', label: 'Port', placeholder: '5432', type: 'text', defaultValue: '5432' },
    { name: 'database', label: 'Database Name', placeholder: 'pulseops_v2', type: 'text', defaultValue: 'pulseops_v2' },
    { name: 'schema', label: 'Schema Name', placeholder: 'pulseops', type: 'text', defaultValue: 'pulseops' },
    { name: 'username', label: 'Username', placeholder: 'postgres', type: 'text', defaultValue: 'postgres' },
    { name: 'password', label: 'Password', placeholder: '••••••••', type: 'password' },
  ];

  const savedConfig = {};

  const handleTest = useCallback(async (config) => {
    try {
      const response = await fetch(urls.database.testConnection, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });
      const result = await response.json();

      if (result?.success) {
        const latency = result.data?.latencyMs || 0;
        const dbVersion = result.data?.dbVersion || '';
        const versionShort = dbVersion ? dbVersion.split(',')[0].replace('PostgreSQL ', '') : '';
        const metaText = versionShort ? `${connectionText.responseTime} ${latency}ms ${connectionText.metaSeparator} ${connectionText.version} ${versionShort}` : `${connectionText.responseTime} ${latency}ms`;
        return {
          success: true,
          message: result.data?.message || connectionText.connected,
          meta: metaText,
        };
      }

      return { success: false, message: result?.error?.message || connectionText.failed };
    } catch (err) {
      return { success: false, message: err.message || connectionText.failed };
    }
  }, []);

  const handleSave = useCallback(async (config) => {
    const response = await fetch(urls.database.saveConfig, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(config),
    });
    const result = await response.json();
    if (!result?.success) throw new Error(result?.error?.message || uiText.errors.serverError);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
        <TestConnection
          title={tabText.dbConfig}
          description={viewText.subtitle}
          icon={Database}
          fields={dbFields}
          onTest={handleTest}
          onSave={handleSave}
          initialConfig={savedConfig}
          autoTest={true}
        />
      </div>
    </div>
  );
}

// ── Database Objects Tab ────────────────────────────────────────────────────
function DatabaseObjectsTab() {
  const [dbStatus, setDbStatus] = useState({
    connected: false, exists: false, schemaInitialized: false, hasDefaultData: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(urls.database.schemaStatus, { credentials: 'include' });
      const result = await response.json();
      if (result?.success && result?.data) {
        setDbStatus({
          connected: true,
          exists: result.data.connected !== false,
          schemaInitialized: result.data.initialized !== false,
          hasDefaultData: result.data.hasDefaultData !== false,
        });
      } else {
        setDbStatus({ connected: true, exists: false, schemaInitialized: false, hasDefaultData: false });
      }
    } catch {
      setDbStatus({ connected: false, exists: false, schemaInitialized: false, hasDefaultData: false });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-base font-bold text-surface-800 mb-1">{tabText.dbObjects}</h3>
        <p className="text-sm text-surface-400">{viewText.subtitle}</p>
      </div>
      <DatabaseManager
        onCreateDatabase={async () => {
          const res = await fetch(urls.database.createDatabase, { method: 'POST', credentials: 'include' });
          const result = await res.json();
          if (!result?.success) throw new Error(result?.error?.message || uiText.errors.serverError);
          return result.data;
        }}
        onDeleteDatabase={async () => {
          const res = await fetch(urls.database.deleteDatabase, { method: 'DELETE', credentials: 'include' });
          const result = await res.json();
          if (!result?.success) throw new Error(result?.error?.message || uiText.errors.serverError);
          return result.data;
        }}
        onInitializeSchema={async () => {
          const res = await fetch(urls.database.createSchema, { method: 'POST', credentials: 'include' });
          const result = await res.json();
          if (!result?.success) throw new Error(result?.error?.message || uiText.errors.serverError);
          return result.data;
        }}
        onLoadDefaultData={async () => {
          const res = await fetch(urls.database.loadDefaultData, { method: 'POST', credentials: 'include' });
          const result = await res.json();
          if (!result?.success) throw new Error(result?.error?.message || uiText.errors.serverError);
          return result.data;
        }}
        onCleanDefaultData={async () => {
          const res = await fetch(urls.database.loadDefaultData, { method: 'DELETE', credentials: 'include' });
          const result = await res.json();
          if (!result?.success) throw new Error(result?.error?.message || uiText.errors.serverError);
          return result.data;
        }}
        onWipeDatabase={async () => {
          const res = await fetch(urls.database.wipe, { method: 'POST', credentials: 'include' });
          const result = await res.json();
          if (!result?.success) throw new Error(result?.error?.message || uiText.errors.serverError);
          return result.data;
        }}
        onRefreshStatus={checkStatus}
        dbStatus={dbStatus}
        isLoading={isLoading}
      />
    </div>
  );
}

// ── Log Settings Tab (File vs Database toggle) ─────────────────────────────
function LogSettingsTab() {
  const [logMode, setLogMode] = useState('file');
  const [dbReady, setDbReady] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [allStats, setAllStats] = useState({ ui: { count: 0 }, api: { count: 0 } });
  const [logStatus, setLogStatus] = useState({ status: 'loading', message: connectionText.testing, meta: null, lastTested: null });
  const apiBase = urls.server.api.url;

  const fetchStatus = useCallback(async () => {
    try {
      const [dbRes, configRes, statsRes] = await Promise.allSettled([
        fetch(`${apiBase}${urls.database.schemaStatus}`, { credentials: 'include' }),
        fetch(`${apiBase}${urls.logs.configStatus}`, { credentials: 'include' }),
        fetch(`${apiBase}${urls.logs.stats}`, { credentials: 'include' }),
      ]);

      if (dbRes.status === 'fulfilled') {
        const dbResult = await dbRes.value.json();
        if (dbResult?.success && dbResult?.data?.initialized) setDbReady(true);
      }

      if (configRes.status === 'fulfilled') {
        const configResult = await configRes.value.json();
        if (configResult?.success && configResult?.data) {
          setLogMode(configResult.data.storage || 'file');
        }
      }

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const statsResult = await statsRes.value.json();
        if (statsResult?.success && statsResult?.data) {
          const d = statsResult.data;
          setAllStats({ ui: d.ui || { count: 0 }, api: d.api || { count: 0 } });
          const totalCount = (d.ui?.count || 0) + (d.api?.count || 0);
          const meta = `UI: ${d.ui?.count || 0} ${connectionText.metaSeparator} API: ${d.api?.count || 0} ${connectionText.metaSeparator} Total: ${totalCount}`;
          const mode = d.storage || 'file';
          setLogStatus({
            status: 'success',
            message: mode === 'file' ? logText.fileActive : logText.dbActive,
            meta,
            lastTested: new Date().toLocaleString(),
          });
        }
      } else {
        setLogStatus({ status: 'success', message: logMode === 'file' ? logText.fileActive : logText.dbActive, meta: null, lastTested: new Date().toLocaleString() });
      }
    } catch {
      setLogStatus({ status: 'error', message: connectionText.failed, meta: null, lastTested: new Date().toLocaleString() });
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleSwitch = useCallback(async (newMode) => {
    if (newMode === logMode) return;
    if (newMode === 'database' && !dbReady) return;
    setIsSwitching(true);
    try {
      const res = await fetch(`${apiBase}${urls.logs.config}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ storage: newMode }),
      });
      const result = await res.json();
      if (result?.success) {
        setLogMode(newMode);
        await fetchStatus();
      }
    } catch {
      // Keep current mode on error
    } finally {
      setIsSwitching(false);
    }
  }, [logMode, dbReady, fetchStatus]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-base font-bold text-surface-800 mb-1">{logText.title}</h3>
        <p className="text-sm text-surface-400">{logText.subtitle}</p>
      </div>

      {/* Log Storage Connection Status */}
      <ConnectionStatus
        type={logMode === 'file' ? logText.fileMode : logText.dbMode}
        status={logStatus.status}
        message={logStatus.message}
        meta={logStatus.meta}
        lastTested={logStatus.lastTested}
        icon={logMode === 'file' ? FileText : Database}
        showBadge={true}
      />

      {/* File Logging Option */}
      <button
        onClick={() => handleSwitch('file')}
        disabled={isSwitching}
        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
          logMode === 'file'
            ? 'border-brand-500 bg-brand-50/50'
            : 'border-surface-200 hover:border-surface-300 cursor-pointer'
        } ${isSwitching ? 'opacity-60 cursor-wait' : ''}`}
      >
        <div className="flex items-start gap-3">
          <FileText size={18} className={logMode === 'file' ? 'text-brand-600' : 'text-surface-400'} />
          <div>
            <p className="text-sm font-semibold text-surface-800">{logText.fileMode}</p>
            <p className="text-xs text-surface-500 mt-0.5">{logText.fileModeDesc}</p>
          </div>
        </div>
      </button>

      {/* Database Logging Option */}
      <button
        onClick={() => handleSwitch('database')}
        disabled={!dbReady || isSwitching}
        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
          !dbReady
            ? 'border-surface-100 bg-surface-50 cursor-not-allowed opacity-60'
            : logMode === 'database'
              ? 'border-brand-500 bg-brand-50/50'
              : 'border-surface-200 hover:border-surface-300 cursor-pointer'
        } ${isSwitching ? 'opacity-60 cursor-wait' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Database size={18} className={logMode === 'database' ? 'text-brand-600' : 'text-surface-400'} />
            <div>
              <p className="text-sm font-semibold text-surface-800">{logText.dbMode}</p>
              <p className="text-xs text-surface-500 mt-0.5">{logText.dbModeDesc}</p>
            </div>
          </div>
          {!dbReady && (
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-100 text-amber-700 shrink-0">
              {logText.dbNotReady}
            </span>
          )}
        </div>
      </button>

      {/* Warning if DB not ready */}
      {!dbReady && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{logText.dbNotReady}</p>
            <p className="mt-0.5 text-amber-700">{logText.dbNotReadyDesc}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Log Configuration Tab ───────────────────────────────────────────────────
function LogConfigTab() {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async (newConfig) => {
    setIsSaving(true);
    try {
      await fetch(urls.config.save, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key: 'logging', value: newConfig }),
      });
    } finally {
      setIsSaving(false);
    }
  }, []);

  return (
    <LoggingConfig
      config={{
        logLevel: 'debug',
        captureOptions: { console: true, api: true, ui: true, moduleLogs: true },
        logSyncLimit: 100,
        autoCleanup: true,
        maxInMemoryEntries: 600,
        moduleLogging: [],
      }}
      onSave={handleSave}
      isSaving={isSaving}
    />
  );
}

// ── Authentication Settings Tab ─────────────────────────────────────────────
function AuthSettingsTab() {
  const [currentProvider, setCurrentProvider] = useState('json_file');
  const [selectedProvider, setSelectedProvider] = useState('json_file');
  const [dbReady, setDbReady] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const PROVIDER_ICONS = { json_file: Shield, database: Database, social: Globe };
  const providerIds = ['json_file', 'database', 'social'];

  useEffect(() => {
    const checkDb = async () => {
      try {
        const response = await fetch(urls.database.schemaStatus, { credentials: 'include' });
        const result = await response.json();
        if (result?.success && result?.data?.initialized && result?.data?.hasDefaultData) {
          setDbReady(true);
        }
      } catch { /* db not ready */ }
    };
    checkDb();
  }, []);

  const handleSwitchProvider = useCallback(async () => {
    const response = await fetch(urls.auth.config, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ provider: selectedProvider }),
    });
    const result = await response.json();
    if (!result?.success) throw new Error(result?.error?.message || uiText.errors.serverError);
    return { provider: selectedProvider, previous: currentProvider };
  }, [selectedProvider, currentProvider]);

  const handleSwitchSuccess = useCallback((result) => {
    setCurrentProvider(result.provider);
  }, []);

  const hasChange = selectedProvider !== currentProvider;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h3 className="text-base font-bold text-surface-800 mb-1">{authText.title}</h3>
        <p className="text-sm text-surface-400">{authText.subtitle}</p>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
        <div className="space-y-3">
          {providerIds.map(providerId => {
            const provTxt = authText.providers?.[providerId] || {};
            const Icon = PROVIDER_ICONS[providerId] || Shield;
            const isActive = providerId === currentProvider;
            const isSelected = providerId === selectedProvider;
            const isSocial = providerId === 'social';
            const isDbProvider = providerId === 'database';
            const isDisabled = isSocial || (isDbProvider && !dbReady);

            return (
              <button
                key={providerId}
                onClick={() => !isDisabled && setSelectedProvider(providerId)}
                disabled={isDisabled}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  isDisabled
                    ? 'border-surface-100 bg-surface-50 cursor-not-allowed opacity-60'
                    : isSelected
                      ? 'border-brand-500 bg-brand-50/50'
                      : 'border-surface-200 hover:border-surface-300 cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Icon
                      size={18}
                      className={`mt-0.5 shrink-0 ${isSelected && !isDisabled ? 'text-brand-600' : 'text-surface-400'}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-surface-800">{provTxt.label || providerId}</p>
                      <p className="text-xs text-surface-500 mt-0.5">{provTxt.description}</p>
                      <p className="text-[11px] text-surface-400 mt-1">{provTxt.detail}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {isActive && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-brand-100 text-brand-700">
                        {authText.activeBadge}
                      </span>
                    )}
                    {isSocial && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-surface-200 text-surface-500">
                        {authText.comingSoonBadge}
                      </span>
                    )}
                    {isDbProvider && !dbReady && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-100 text-amber-700">
                        {logText.dbNotReady}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* DB not ready warning when switching to database */}
        {hasChange && selectedProvider === 'database' && !dbReady && (
          <div className="flex items-start gap-2 p-3 mt-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{authText.dbNotReadyWarning}</p>
              <p className="mt-0.5 text-amber-700">{authText.dbRequiredNote}</p>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowModal(true)}
            disabled={!hasChange}
          >
            {authText.switchButton}
          </Button>
          {hasChange && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedProvider(currentProvider)}>
              {uiText.common.cancel}
            </Button>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={authText.crud.switchProvider.confirmLabel}
        confirmMessage={authText.crud.switchProvider.confirmMessage}
        confirmLabel={authText.crud.switchProvider.confirmLabel}
        action={handleSwitchProvider}
        onSuccess={handleSwitchSuccess}
        variant={selectedProvider === 'database' ? 'warning' : 'info'}
        buildSummary={(data) => [
          { label: authText.crud.switchProvider.summaryProvider, value: (authText.providers?.[data?.provider]?.label) || data?.provider },
          { label: authText.crud.switchProvider.summaryPrevious, value: (authText.providers?.[data?.previous]?.label) || data?.previous },
          { label: authText.crud.switchProvider.summaryStatus, value: authText.crud.switchProvider.summarySuccess },
        ]}
      />
    </div>
  );
}

// ── Main Settings Component ─────────────────────────────────────────────────
export default function Settings() {
  const tabs = [
    { id: 'dbConfig', label: tabText.dbConfig, icon: Database, content: <DatabaseConfigTab /> },
    { id: 'dbObjects', label: tabText.dbObjects, icon: Layers, content: <DatabaseObjectsTab /> },
    { id: 'logSettings', label: tabText.logSettings, icon: FileText, content: <LogSettingsTab />, separator: true },
    { id: 'logConfig', label: tabText.logConfig, icon: ScrollText, content: <LogConfigTab /> },
    { id: 'authSettings', label: tabText.authSettings, icon: Shield, content: <AuthSettingsTab />, separator: true },
  ];

  return (
    <ConfigLayout
      title={viewText.title}
      subtitle={viewText.subtitle}
      icon={SettingsIcon}
      tabs={tabs}
      defaultTab="dbConfig"
    />
  );
}
