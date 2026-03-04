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
  Shield, Globe, AlertTriangle, RefreshCw, Check, Save, Globe2
} from 'lucide-react';
import { ConfigLayout, TestConnection, DatabaseManager, LoggingConfig, Button, ConfirmationModal, ConnectionStatus, TimezoneService, createLogger } from '@shared';
import uiText from '@config/uiElementsText.json';
import uiMessages from '@config/UIMessages.json';
import urls from '@config/urls.json';

const log = createLogger('Settings.jsx');

const viewText = uiText.coreViews.settings;
const tabText = viewText.tabs;
const logText = viewText.logSettings;
const authText = viewText.authSettings;
const connectionText = viewText.connectionStatus;

// ── Database Configuration Tab ──────────────────────────────────────────────
function DatabaseConfigTab() {
  const dbFieldsConfig = uiText.admin.settings.databaseConfiguration.fields;
  const dbFields = [
    { name: 'host', label: dbFieldsConfig.host.label, placeholder: dbFieldsConfig.host.placeholder, type: 'text' },
    { name: 'port', label: dbFieldsConfig.port.label, placeholder: dbFieldsConfig.port.placeholder, type: 'text' },
    { name: 'database', label: dbFieldsConfig.database.label, placeholder: dbFieldsConfig.database.placeholder, type: 'text' },
    { name: 'schema', label: dbFieldsConfig.schema.label, placeholder: dbFieldsConfig.schema.placeholder, type: 'text' },
    { name: 'username', label: dbFieldsConfig.username.label, placeholder: dbFieldsConfig.username.placeholder, type: 'text' },
    { name: 'password', label: dbFieldsConfig.password.label, placeholder: dbFieldsConfig.password.placeholder, type: 'password' },
  ];

  const [savedConfig, setSavedConfig] = useState({});
  const initRan = React.useRef(false);

  // Load saved config from API on mount (no hardcoded defaults)
  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;
    log.info('DatabaseConfigTab', 'Tab accessed — loading saved configuration from API');
    const loadConfig = async () => {
      try {
        const response = await fetch(urls.database.config, { credentials: 'include' });
        if (response.ok) {
          const result = await response.json();
          if (result?.data) {
            setSavedConfig({
              host: result.data.host || '',
              port: result.data.port ? String(result.data.port) : '',
              database: result.data.database || '',
              schema: result.data.schema || '',
              username: result.data.user || '',
            });
            log.info('DatabaseConfigTab', 'Config loaded from API', { host: result.data.host, database: result.data.database });
          }
        }
      } catch (err) {
        log.error('DatabaseConfigTab', 'Failed to load saved config', { message: err.message });
      }
    };
    loadConfig();
  }, []);

  const handleTest = useCallback(async (config) => {
    log.info('DatabaseConfigTab:handleTest', 'Testing connection', { host: config.host, port: config.port, database: config.database });
    try {
      const response = await fetch(urls.database.testConfig, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });
      const result = await response.json();

      if (result?.success) {
        const latency = result.data?.latencyMs || 0;
        const dbVersion = result.data?.dbVersion || '';
        const dbType = result.data?.dbType || '';
        const versionShort = dbVersion ? dbVersion.split(',')[0].replace('PostgreSQL ', '') : '';
        const parts = [`${connectionText.responseTime} ${latency}ms`];
        if (dbType) parts.push(`${connectionText.dbType} ${dbType}`);
        if (versionShort) parts.push(`${connectionText.version} ${versionShort}`);
        const metaText = parts.join(` ${connectionText.metaSeparator} `);
        log.info('DatabaseConfigTab:handleTest', 'Connection test successful', { latency, dbType, version: versionShort });
        return {
          success: true,
          message: result.data?.message || connectionText.connected,
          meta: metaText,
        };
      }

      log.warn('DatabaseConfigTab:handleTest', 'Connection test failed', { message: result?.error?.message });
      return { success: false, message: result?.error?.message || connectionText.failed };
    } catch (err) {
      log.error('DatabaseConfigTab:handleTest', 'Connection test error', { message: err.message });
      return { success: false, message: err.message || connectionText.failed };
    }
  }, []);

  const handleSave = useCallback(async (config) => {
    log.info('DatabaseConfigTab:handleSave', 'Saving configuration', { host: config.host, database: config.database });
    const response = await fetch(urls.database.config, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(config),
    });
    const result = await response.json();
    if (!result?.success) {
      log.error('DatabaseConfigTab:handleSave', 'Save failed', { message: result?.error?.message });
      throw new Error(result?.error?.message || uiText.errors.serverError);
    }
    log.info('DatabaseConfigTab:handleSave', 'Configuration saved successfully');
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
  const initRan = React.useRef(false);

  const checkStatus = useCallback(async () => {
    log.info('DatabaseObjectsTab:checkStatus', 'Checking database connection and schema status');
    setIsLoading(true);
    try {
      // Step 1: Test actual DB connection with server config
      const connResponse = await fetch(urls.database.connection, { credentials: 'include' });
      const connResult = await connResponse.json();

      if (!connResult?.success) {
        // Connection failed — report the real error, don't allow any DB operations
        const errMsg = connResult?.error?.message || connectionText.failed;
        const errCode = connResult?.error?.code || 'CONNECTION_FAILED';
        log.warn('DatabaseObjectsTab:checkStatus', `Connection test failed: ${errMsg}`, { code: errCode });
        setDbStatus({
          connected: false,
          exists: errCode !== 'DB_NOT_EXIST',
          schemaInitialized: false,
          hasDefaultData: false,
          connectionError: errMsg,
        });
        setIsLoading(false);
        return;
      }

      log.info('DatabaseObjectsTab:checkStatus', 'Connection test passed — checking schema status');

      // Step 2: Connection succeeded — now check schema status
      const response = await fetch(urls.database.schema, { credentials: 'include' });
      const result = await response.json();
      if (result?.success && result?.data) {
        const status = {
          connected: true,
          exists: result.data.connected !== false,
          schemaInitialized: result.data.initialized !== false,
          hasDefaultData: result.data.hasDefaultData !== false,
          connectionError: null,
        };
        setDbStatus(status);
        log.info('DatabaseObjectsTab:checkStatus', 'Schema status loaded', status);
      } else {
        setDbStatus({ connected: true, exists: true, schemaInitialized: false, hasDefaultData: false, connectionError: null });
        log.warn('DatabaseObjectsTab:checkStatus', 'Schema status returned no data');
      }
    } catch (err) {
      setDbStatus({ connected: false, exists: false, schemaInitialized: false, hasDefaultData: false, connectionError: err.message });
      log.error('DatabaseObjectsTab:checkStatus', 'Failed to check status', { message: err.message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initRan.current) {
      initRan.current = true;
      log.info('DatabaseObjectsTab', 'Tab accessed — loading database objects status');
      checkStatus();
    }
  }, [checkStatus]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-base font-bold text-surface-800 mb-1">{tabText.dbObjects}</h3>
        <p className="text-sm text-surface-400">{viewText.subtitle}</p>
      </div>
      <DatabaseManager
        onCreateDatabase={async () => {
          log.info('DatabaseObjectsTab', 'Creating database');
          const res = await fetch(urls.database.instance, { method: 'POST', credentials: 'include' });
          const result = await res.json();
          if (!result?.success) { log.error('DatabaseObjectsTab', 'Create database failed', { message: result?.error?.message }); throw new Error(result?.error?.message || uiText.errors.serverError); }
          log.info('DatabaseObjectsTab', 'Database created successfully', result.data);
          return result.data;
        }}
        onDeleteDatabase={async () => {
          log.info('DatabaseObjectsTab', 'Deleting database');
          const res = await fetch(urls.database.instance, { method: 'DELETE', credentials: 'include' });
          const result = await res.json();
          if (!result?.success) { log.error('DatabaseObjectsTab', 'Delete database failed', { message: result?.error?.message }); throw new Error(result?.error?.message || uiText.errors.serverError); }
          log.info('DatabaseObjectsTab', 'Database deleted successfully', result.data);
          return result.data;
        }}
        onInitializeSchema={async () => {
          log.info('DatabaseObjectsTab', 'Initializing schema');
          const res = await fetch(urls.database.schema, { method: 'POST', credentials: 'include' });
          const result = await res.json();
          if (!result?.success) { log.error('DatabaseObjectsTab', 'Schema init failed', { message: result?.error?.message }); throw new Error(result?.error?.message || uiText.errors.serverError); }
          log.info('DatabaseObjectsTab', 'Schema initialized successfully', result.data);
          return result.data;
        }}
        onLoadDefaultData={async () => {
          log.info('DatabaseObjectsTab', 'Loading default data');
          const res = await fetch(urls.database.schemaSeed, { method: 'POST', credentials: 'include' });
          const result = await res.json();
          if (!result?.success) { log.error('DatabaseObjectsTab', 'Load default data failed', { message: result?.error?.message }); throw new Error(result?.error?.message || uiText.errors.serverError); }
          log.info('DatabaseObjectsTab', 'Default data loaded successfully', result.data);
          return result.data;
        }}
        onCleanDefaultData={async () => {
          log.info('DatabaseObjectsTab', 'Cleaning default data');
          const res = await fetch(urls.database.schemaSeed, { method: 'DELETE', credentials: 'include' });
          const result = await res.json();
          if (!result?.success) { log.error('DatabaseObjectsTab', 'Clean default data failed', { message: result?.error?.message }); throw new Error(result?.error?.message || uiText.errors.serverError); }
          log.info('DatabaseObjectsTab', 'Default data cleaned successfully', result.data);
          return result.data;
        }}
        onWipeDatabase={async () => {
          log.info('DatabaseObjectsTab', 'Wiping database');
          const res = await fetch(urls.database.schema, { method: 'DELETE', credentials: 'include' });
          const result = await res.json();
          if (!result?.success) { log.error('DatabaseObjectsTab', 'Wipe database failed', { message: result?.error?.message }); throw new Error(result?.error?.message || uiText.errors.serverError); }
          log.info('DatabaseObjectsTab', 'Database wiped successfully', result.data);
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
  const initRan = React.useRef(false);

  const fetchStatus = useCallback(async () => {
    log.info('LogSettingsTab:fetchStatus', 'Fetching log storage status');
    try {
      const [dbRes, configRes, statsRes] = await Promise.allSettled([
        fetch(urls.database.schema, { credentials: 'include' }),
        fetch(urls.logs.settingsStatus, { credentials: 'include' }),
        fetch(urls.logs.stats, { credentials: 'include' }),
      ]);

      if (dbRes.status === 'fulfilled') {
        const dbResult = await dbRes.value.json();
        if (dbResult?.success && dbResult?.data?.initialized) setDbReady(true);
      }

      if (configRes.status === 'fulfilled') {
        const configResult = await configRes.value.json();
        if (configResult?.success && configResult?.data) {
          setLogMode(configResult.data.storage || 'file');
          log.info('LogSettingsTab:fetchStatus', `Log mode loaded: ${configResult.data.storage || 'file'}`);
        }
      }

      const timeString = TimezoneService.formatCurrentTime();
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
            lastTested: timeString,
          });
          log.info('LogSettingsTab:fetchStatus', 'Stats loaded', { uiCount: d.ui?.count, apiCount: d.api?.count, totalCount });
        }
      } else {
        setLogStatus({ status: 'success', message: logMode === 'file' ? logText.fileActive : logText.dbActive, meta: null, lastTested: timeString });
      }
    } catch (err) {
      log.error('LogSettingsTab:fetchStatus', 'Failed to fetch status', { message: err.message });
      setLogStatus({ status: 'error', message: connectionText.failed, meta: null, lastTested: TimezoneService.formatCurrentTime() });
    }
  }, []);

  useEffect(() => {
    if (!initRan.current) {
      initRan.current = true;
      log.info('LogSettingsTab', 'Tab accessed — loading log settings');
      fetchStatus();
    }
  }, [fetchStatus]);

  const handleSwitch = useCallback(async (newMode) => {
    if (newMode === logMode) return;
    if (newMode === 'database' && !dbReady) return;
    log.info('LogSettingsTab:handleSwitch', `Switching log mode: ${logMode} → ${newMode}`);
    setIsSwitching(true);
    try {
      const res = await fetch(urls.logs.settings, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ storage: newMode }),
      });
      const result = await res.json();
      if (result?.success) {
        setLogMode(newMode);
        log.info('LogSettingsTab:handleSwitch', `Log mode switched to: ${newMode}`);
        await fetchStatus();
      } else {
        log.error('LogSettingsTab:handleSwitch', 'Switch failed', { message: result?.error?.message });
      }
    } catch (err) {
      log.error('LogSettingsTab:handleSwitch', 'Switch error', { message: err.message });
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

  log.debug('LogConfigTab', 'Tab accessed — rendering log configuration');

  const handleSave = useCallback(async (newConfig) => {
    log.info('LogConfigTab:handleSave', 'Saving log configuration', newConfig);
    setIsSaving(true);
    try {
      await fetch(urls.systemConfig.save, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key: 'logging', value: newConfig }),
      });
      log.info('LogConfigTab:handleSave', 'Log configuration saved successfully');
    } catch (err) {
      log.error('LogConfigTab:handleSave', 'Save failed', { message: err.message });
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
  const initRan = React.useRef(false);

  const PROVIDER_ICONS = { json_file: Shield, database: Database, social: Globe };
  const providerIds = ['json_file', 'database', 'social'];

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;
    log.info('AuthSettingsTab', 'Tab accessed — checking database readiness for auth providers');
    const checkDb = async () => {
      try {
        const response = await fetch(urls.database.schema, { credentials: 'include' });
        const result = await response.json();
        if (result?.success && result?.data?.initialized && result?.data?.hasDefaultData) {
          setDbReady(true);
          log.info('AuthSettingsTab', 'Database is ready for auth provider switching');
        } else {
          log.info('AuthSettingsTab', 'Database not ready for auth provider switching');
        }
      } catch (err) {
        log.warn('AuthSettingsTab', 'Database check failed', { message: err.message });
      }
    };
    checkDb();
  }, []);

  const handleSwitchProvider = useCallback(async () => {
    log.info('AuthSettingsTab:handleSwitchProvider', `Switching auth provider: ${currentProvider} → ${selectedProvider}`);
    const response = await fetch(urls.auth.provider, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ provider: selectedProvider }),
    });
    const result = await response.json();
    if (!result?.success) {
      log.error('AuthSettingsTab:handleSwitchProvider', 'Provider switch failed', { message: result?.error?.message });
      throw new Error(result?.error?.message || uiText.errors.serverError);
    }
    log.info('AuthSettingsTab:handleSwitchProvider', `Auth provider switched to: ${selectedProvider}`);
    return { provider: selectedProvider, previous: currentProvider };
  }, [selectedProvider, currentProvider]);

  const handleSwitchSuccess = useCallback((result) => {
    log.info('AuthSettingsTab:handleSwitchSuccess', `Provider switch confirmed: ${result.provider}`);
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
        actionDescription={`switch authentication provider to ${(authText.providers?.[selectedProvider]?.label) || selectedProvider}`}
        actionTarget="Platform Authentication"
        actionDetails={[
          { label: 'Current Provider', value: (authText.providers?.[currentProvider]?.label) || currentProvider },
          { label: 'New Provider', value: (authText.providers?.[selectedProvider]?.label) || selectedProvider },
        ]}
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

// ── General Settings Tab ─────────────────────────────────────────────────────
const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'IST — India Standard Time (UTC+05:30)' },
  { value: 'UTC', label: 'UTC — Coordinated Universal Time' },
  { value: 'America/New_York', label: 'EST/EDT — Eastern Time (US)' },
  { value: 'America/Chicago', label: 'CST/CDT — Central Time (US)' },
  { value: 'America/Los_Angeles', label: 'PST/PDT — Pacific Time (US)' },
  { value: 'Europe/London', label: 'GMT/BST — London' },
  { value: 'Europe/Berlin', label: 'CET/CEST — Central Europe' },
  { value: 'Asia/Dubai', label: 'GST — Gulf Standard Time (UTC+04:00)' },
  { value: 'Asia/Singapore', label: 'SGT — Singapore Time (UTC+08:00)' },
  { value: 'Asia/Tokyo', label: 'JST — Japan Standard Time (UTC+09:00)' },
  { value: 'Australia/Sydney', label: 'AEST/AEDT — Sydney' },
];

function GeneralSettingsTab() {
  const [settings, setSettings] = useState({ timezone: '', dateFormat: '', timeFormat: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const initRan = React.useRef(false);
  const gsMessages = uiMessages.generalSettings;

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;
    log.info('GeneralSettingsTab', 'Tab accessed — loading general settings from API');
    const load = async () => {
      try {
        const res = await fetch(urls.settings.get, { credentials: 'include' });
        const json = await res.json();
        if (json.success) {
          setSettings(json.data);
          log.info('GeneralSettingsTab', 'Settings loaded from API', json.data);
        }
      } catch (err) {
        log.error('GeneralSettingsTab', 'Failed to load settings', { message: err.message });
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const handleSaveAction = useCallback(async () => {
    log.info('GeneralSettingsTab:handleSaveAction', 'Saving general settings', settings);
    const res = await fetch(urls.settings.save, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(settings),
    });
    const json = await res.json();
    if (!json.success) {
      log.error('GeneralSettingsTab:handleSaveAction', 'Save failed', { message: json?.error?.message });
      throw new Error(json?.error?.message || gsMessages.saveFailed);
    }
    log.info('GeneralSettingsTab:handleSaveAction', 'Settings saved successfully');
    return { timezone: settings.timezone, dateFormat: settings.dateFormat, timeFormat: settings.timeFormat };
  }, [settings]);

  const tzLabel = TIMEZONE_OPTIONS.find(tz => tz.value === settings.timezone)?.label || settings.timezone;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-base font-bold text-surface-800 mb-1">{tabText.generalSettings}</h3>
        <p className="text-sm text-surface-400">{gsMessages.subtitle}</p>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-5 shadow-sm space-y-5">
        {/* Timezone */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 mb-2">{gsMessages.timezoneLabel}</label>
          <p className="text-xs text-surface-400 mb-2">{gsMessages.timezoneDescription}</p>
          <select
            value={settings.timezone}
            onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
            className="w-full max-w-md px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            {TIMEZONE_OPTIONS.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
          <p className="text-[10px] text-surface-400 mt-1">Current selection: <span className="font-semibold text-surface-600">{settings.timezone}</span></p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="md"
          icon={<Save size={16} />}
          onClick={() => setShowSaveModal(true)}
        >
          Save Settings
        </Button>
      </div>

      <ConfirmationModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title={gsMessages.confirmTitle}
        actionDescription={gsMessages.confirmDescription}
        actionTarget={gsMessages.confirmTarget}
        actionDetails={[
          { label: gsMessages.summaryTimezone, value: tzLabel },
        ]}
        confirmLabel="Save"
        action={handleSaveAction}
        onSuccess={(data) => { if (data?.timezone) TimezoneService.setTimezone(data.timezone); }}
        variant="info"
        buildSummary={(data) => [
          { label: gsMessages.summaryTimezone, value: TIMEZONE_OPTIONS.find(tz => tz.value === data?.timezone)?.label || data?.timezone },
          { label: gsMessages.summaryStatus, value: gsMessages.summarySuccess },
        ]}
      />
    </div>
  );
}

// ── Main Settings Component ─────────────────────────────────────────────────
export default function Settings() {
  const tabs = [
    { id: 'generalSettings', label: tabText.generalSettings, icon: Globe2, content: () => <GeneralSettingsTab /> },
    { id: 'dbConfig', label: tabText.dbConfig, icon: Database, content: () => <DatabaseConfigTab />, separator: true },
    { id: 'dbObjects', label: tabText.dbObjects, icon: Layers, content: () => <DatabaseObjectsTab /> },
    { id: 'logSettings', label: tabText.logSettings, icon: FileText, content: () => <LogSettingsTab />, separator: true },
    { id: 'logConfig', label: tabText.logConfig, icon: ScrollText, content: () => <LogConfigTab /> },
    { id: 'authSettings', label: tabText.authSettings, icon: Shield, content: () => <AuthSettingsTab />, separator: true },
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
