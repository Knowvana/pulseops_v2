// ============================================================================
// TestPage Component — PulseOps V2
//
// PURPOSE: Central testing page for all UI components during development.
// All new components should be added here for visual verification.
//
// USAGE: Import in main.jsx for development testing.
// ============================================================================
import React, { useState } from 'react';
import { LogIn, Database, Settings, Shield, Key, Sliders, AlertCircle, Clock, CheckCircle2, Ticket } from 'lucide-react';
import Button from '@shared/components/Button';
import LoginForm from '@shared/components/LoginForm';
import ConfigLayout from '@shared/components/ConfigLayout';
import ConnectionStatus from '@shared/components/ConnectionStatus';
import TestConnection from '@shared/components/TestConnection';
import StatsCount from '@shared/components/StatsCount';
import DatabaseManager from '@shared/components/DatabaseManager';
import LoggingConfig from '@shared/components/LoggingConfig';

export default function TestPage() {
  // State for managing various component demos
  const [testResult, setTestResult] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // State for StatsCount component - ticket counts simulation
  const [ticketCounts, setTicketCounts] = useState([
    { id: 'total-incidents', label: 'Total Incidents', value: 0, color: 'danger' },
    { id: 'open-incidents', label: 'Open Incidents', value: 0, color: 'danger' },
    { id: 'total-ritms', label: 'Total RITMs', value: 0, color: 'info' },
    { id: 'open-ritms', label: 'Open RITMs', value: 0, color: 'info' },
    { id: 'total-changes', label: 'Total Changes', value: 0, color: 'success' },
    { id: 'pending-changes', label: 'Pending Changes', value: 0, color: 'success' },
  ]);

  // Simulate progress animation for loading state
  React.useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) return 100;
        return prev + Math.random() * 30;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Handler for LoginForm component demo
  const handleLogin = async (email, password) => {
    console.log('Login attempt:', { email, password });
    await new Promise(resolve => setTimeout(resolve, 1500));
  };

  // Handler for TestConnection component demo - simulates database connection test
  const handleTestConnection = async (config) => {
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate success/failure randomly for demo
    const isSuccess = Math.random() > 0.3;
    
    if (isSuccess) {
      return {
        success: true,
        message: 'Connected to PostgreSQL successfully',
        meta: 'Response: 45ms • Version: 14.2',
      };
    } else {
      throw new Error('Connection refused: Database does not exist');
    }
  };

  // Handler for saving configuration in TestConnection component
  const handleSaveConfig = async (config) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Configuration saved:', config);
  };

  // Handler for StatsCount component - simulates syncing ticket data from ServiceNow
  const handleSyncTickets = async () => {
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate updated counts from ServiceNow
    setTicketCounts([
      { id: 'total-incidents', label: 'Total Incidents', value: Math.floor(Math.random() * 50) + 40, color: 'danger' },
      { id: 'open-incidents', label: 'Open Incidents', value: Math.floor(Math.random() * 30) + 15, color: 'danger' },
      { id: 'total-ritms', label: 'Total RITMs', value: Math.floor(Math.random() * 40) + 20, color: 'info' },
      { id: 'open-ritms', label: 'Open RITMs', value: Math.floor(Math.random() * 20) + 8, color: 'info' },
      { id: 'total-changes', label: 'Total Changes', value: Math.floor(Math.random() * 25) + 10, color: 'success' },
      { id: 'pending-changes', label: 'Pending Changes', value: Math.floor(Math.random() * 10) + 3, color: 'success' },
    ]);
    
    setIsSyncing(false);
    console.log('Tickets synced successfully');
  };

  const handleLoginServiceNow = () => {
    setIsLoggedIn(true);
    console.log('ServiceNow login opened');
  };

  // Database Manager state and handlers for DatabaseManager component demo
  const [dbStatus, setDbStatus] = useState({
    connected: true,
    exists: false,
    schemaInitialized: false,
    hasDefaultData: false,
  });
  const [isRefreshingDb, setIsRefreshingDb] = useState(false);

  // Database Manager handlers
  const handleCreateDatabase = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { database: 'pulseops_v2', created: true };
  };

  const handleDeleteDatabase = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { database: 'pulseops_v2', deleted: true };
  };

  const handleInitializeSchema = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { tables: ['users', 'roles', 'modules', 'logs'], initialized: true };
  };

  const handleLoadDefaultData = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { loaded: true };
  };

  const handleCleanDefaultData = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { cleaned: true };
  };

  const handleWipeDatabase = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { wiped: true };
  };

  const handleRefreshDbStatus = async () => {
    setIsRefreshingDb(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setDbStatus(prev => ({
      ...prev,
      exists: true,
      schemaInitialized: true,
      hasDefaultData: true,
    }));
    setIsRefreshingDb(false);
  };

  // Logging Config state and handlers for LoggingConfig component demo
  const [loggingConfig, setLoggingConfig] = useState({
    logLevel: 'debug',
    captureOptions: { console: true, api: true, ui: true, moduleLogs: true },
    logSyncLimit: 100,
    autoCleanup: true,
    maxInMemoryEntries: 600,
    moduleLogging: [
      { id: 'platform_admin', name: 'Platform Admin', enabled: true },
      { id: 'shift_roster', name: 'Shift Roster Planner', enabled: true },
    ],
  });
  const [isSavingLogging, setIsSavingLogging] = useState(false);

  // Handler for saving logging configuration in LoggingConfig component
  const handleSaveLoggingConfig = async (newConfig) => {
    setIsSavingLogging(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoggingConfig(newConfig);
    setIsSavingLogging(false);
    console.log('Logging config saved:', newConfig);
  };

  // Sample tabs for ConfigLayout component demo
  const configTabs = [
    {
      id: 'database',
      label: 'Database',
      icon: Database,
      content: (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-surface-800">Database Configuration</h3>
          <p className="text-sm text-surface-500">Configure your PostgreSQL database connection.</p>
          <TestConnection
            title="PostgreSQL Connection"
            description="Configure and test database connection"
            icon={Database}
            fields={[
              { name: 'host', label: 'Host', placeholder: 'localhost', type: 'text', defaultValue: 'localhost' },
              { name: 'port', label: 'Port', placeholder: '5432', type: 'text', defaultValue: '5432' },
              { name: 'database', label: 'Database', placeholder: 'pulseops_v2', type: 'text', defaultValue: 'pulseops_v2' },
              { name: 'username', label: 'Username', placeholder: 'postgres', type: 'text', defaultValue: 'postgres' },
              { name: 'password', label: 'Password', placeholder: '••••••', type: 'password' },
            ]}
            onTest={handleTestConnection}
            onSave={handleSaveConfig}
          />
        </div>
      ),
    },
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
      content: (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-surface-800">Security Settings</h3>
          <p className="text-sm text-surface-500">Configure authentication and authorization settings.</p>
          <div className="bg-surface-50 rounded-xl p-6 text-center">
            <Shield size={32} className="mx-auto text-surface-300 mb-2" />
            <p className="text-sm text-surface-600">Security configuration options coming soon</p>
          </div>
        </div>
      ),
    },
    {
      id: 'advanced',
      label: 'Advanced',
      icon: Sliders,
      separator: true,
      content: (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-surface-800">Advanced Settings</h3>
          <p className="text-sm text-surface-500">Advanced platform configuration options.</p>
          <div className="bg-surface-50 rounded-xl p-6 text-center">
            <Sliders size={32} className="mx-auto text-surface-300 mb-2" />
            <p className="text-sm text-surface-600">Advanced settings coming soon</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <div className="bg-white border-b border-surface-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-surface-800">PulseOps V2 — Component Test Page</h1>
        <p className="text-sm text-surface-500 mt-1">Visual verification for all UI components</p>
      </div>

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Button Component Test */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-surface-200">
          <h2 className="text-xl font-bold text-surface-800 mb-4">Button.jsx - Button Component</h2>
          <p className="text-sm text-surface-600 mb-4">Primary button with gradient matching LoginForm</p>
          <div className="flex gap-4">
            <Button variant="primary" icon={<LogIn />}>
              Sign In
            </Button>
          </div>
        </section>

        {/* ConnectionStatus Component Test */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-surface-200">
          <h2 className="text-xl font-bold text-surface-800 mb-4">ConnectionStatus.jsx - ConnectionStatus Component</h2>
          <p className="text-sm text-surface-600 mb-4">Reusable component for displaying connection states with Last Tested timestamp and status badges</p>
          <div className="space-y-4">
            <ConnectionStatus
              type="Database Connection"
              status="loading"
              message="Connecting to PostgreSQL..."
              progress={Math.min(loadingProgress, 100)}
              showBadge={true}
            />
            <ConnectionStatus
              type="Database Connection"
              status="success"
              message="Connected to PostgreSQL successfully"
              meta="Response: 45ms • Version: 14.2"
              lastTested="3/1/2026, 10:30:19 PM"
              showBadge={true}
            />
            <ConnectionStatus
              type="API Connection"
              status="error"
              message="Connection refused: Service unavailable"
              meta="Last attempt: 2 minutes ago"
              lastTested="3/1/2026, 10:25:45 PM"
              showBadge={true}
            />
            <ConnectionStatus
              type="External Service"
              status="warning"
              message="Connection established with high latency"
              meta="Response: 2500ms • Consider optimization"
              lastTested="3/1/2026, 10:28:10 PM"
              showBadge={true}
            />
            <ConnectionStatus
              type="Cache Server"
              status="neutral"
              message="Not configured"
              meta="Configure Redis connection in settings"
              showBadge={false}
            />
          </div>
        </section>

        {/* TestConnection Component Test */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-surface-200">
          <h2 className="text-xl font-bold text-surface-800 mb-4">TestConnection.jsx - TestConnection Component</h2>
          <p className="text-sm text-surface-600 mb-4">Reusable component for testing service connections</p>
          <TestConnection
            title="Database Connection"
            description="Configure and test PostgreSQL connection"
            icon={Database}
            fields={[
              { name: 'host', label: 'Host', placeholder: 'localhost', type: 'text', defaultValue: 'localhost' },
              { name: 'port', label: 'Port', placeholder: '5432', type: 'text', defaultValue: '5432' },
              { name: 'database', label: 'Database', placeholder: 'pulseops_v2', type: 'text', defaultValue: 'pulseops_v2' },
              { name: 'username', label: 'Username', placeholder: 'postgres', type: 'text', defaultValue: 'postgres' },
              { name: 'password', label: 'Password', placeholder: '••••••', type: 'password' },
            ]}
            onTest={handleTestConnection}
            onSave={handleSaveConfig}
          />
        </section>

        {/* ConfigLayout Component Test */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-surface-200">
          <h2 className="text-xl font-bold text-surface-800 mb-4">ConfigLayout.jsx - ConfigLayout Component</h2>
          <p className="text-sm text-surface-600 mb-6">Reusable tabbed configuration layout used by all modules</p>
          <ConfigLayout
            title="Module Configuration"
            subtitle="Configure module settings and connections"
            icon={Settings}
            tabs={configTabs}
            defaultTab="database"
          />
        </section>

        {/* StatsCount Component Test */}
        <section>
          <h2 className="text-xl font-bold text-surface-800 mb-4">StatsCount.jsx - StatsCount Component</h2>
          <p className="text-sm text-surface-600 mb-4">Reusable component for displaying count statistics in single-row layout matching ServiceNow dashboard</p>
          <StatsCount
            title="Ticket Counts"
            icon={Ticket}
            counts={ticketCounts}
            lastLoad="3/2/2026, 10:46:36 AM"
            autoSyncSchedule="Not Configured"
            onSync={handleSyncTickets}
            isSyncing={isSyncing}
          />
        </section>

        {/* DatabaseManager Component Test */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-surface-200">
          <h2 className="text-xl font-bold text-surface-800 mb-4">DatabaseManager.jsx - DatabaseManager Component</h2>
          <p className="text-sm text-surface-600 mb-4">Reusable component for managing database schema, default data, and database operations</p>
          <DatabaseManager
            onCreateDatabase={handleCreateDatabase}
            onDeleteDatabase={handleDeleteDatabase}
            onInitializeSchema={handleInitializeSchema}
            onLoadDefaultData={handleLoadDefaultData}
            onCleanDefaultData={handleCleanDefaultData}
            onWipeDatabase={handleWipeDatabase}
            onRefreshStatus={handleRefreshDbStatus}
            dbStatus={dbStatus}
            isLoading={isRefreshingDb}
          />
        </section>

        {/* LoggingConfig Component Test */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-surface-200">
          <h2 className="text-xl font-bold text-surface-800 mb-4">LoggingConfig.jsx - LoggingConfig Component</h2>
          <p className="text-sm text-surface-600 mb-4">Reusable component for configuring logging with module-wise controls and JSON/Database switching</p>
          <LoggingConfig
            config={loggingConfig}
            onSave={handleSaveLoggingConfig}
            isSaving={isSavingLogging}
          />
        </section>

        {/* LoginForm Component Test */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-surface-200">
          <h2 className="text-xl font-bold text-surface-800 mb-4">LoginForm.jsx - LoginForm Component</h2>
          <p className="text-sm text-surface-600 mb-6">Full login form with gradient background and button</p>
          <LoginForm onLogin={handleLogin} />
        </section>
      </div>
    </div>
  );
}
