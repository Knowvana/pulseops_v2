// ============================================================================
// TestPage Component — PulseOps V2
//
// PURPOSE: Central testing page for all UI components during development.
// All new components should be added here for visual verification.
//
// USAGE: Import in main.jsx for development testing.
// ============================================================================
import React, { useState } from 'react';
import { LogIn, Database, Settings, Shield, Key, Sliders } from 'lucide-react';
import Button from '@shared/components/Button';
import LoginForm from '@shared/components/LoginForm';
import ConfigLayout from '@shared/components/ConfigLayout';
import ConnectionStatus from '@shared/components/ConnectionStatus';
import TestConnection from '@shared/components/TestConnection';

export default function TestPage() {
  const [testResult, setTestResult] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

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

  const handleLogin = async (email, password) => {
    console.log('Login attempt:', { email, password });
    await new Promise(resolve => setTimeout(resolve, 1500));
  };

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

  const handleSaveConfig = async (config) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Configuration saved:', config);
  };

  // Sample tabs for ConfigLayout
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
          <h2 className="text-xl font-bold text-surface-800 mb-4">Button Component</h2>
          <p className="text-sm text-surface-600 mb-4">Primary button with gradient matching LoginForm</p>
          <div className="flex gap-4">
            <Button variant="primary" icon={<LogIn />}>
              Sign In
            </Button>
          </div>
        </section>

        {/* ConnectionStatus Component Test */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-surface-200">
          <h2 className="text-xl font-bold text-surface-800 mb-4">ConnectionStatus Component</h2>
          <p className="text-sm text-surface-600 mb-4">Reusable component for displaying connection states (including loading with progress)</p>
          <div className="space-y-4">
            <ConnectionStatus
              type="Database Connection"
              status="loading"
              message="Connecting to PostgreSQL..."
              progress={Math.min(loadingProgress, 100)}
            />
            <ConnectionStatus
              type="Database Connection"
              status="success"
              message="Connected to PostgreSQL successfully"
              meta="Response: 45ms • Version: 14.2"
            />
            <ConnectionStatus
              type="API Connection"
              status="error"
              message="Connection refused: Service unavailable"
              meta="Last attempt: 2 minutes ago"
            />
            <ConnectionStatus
              type="External Service"
              status="warning"
              message="Connection established with high latency"
              meta="Response: 2500ms • Consider optimization"
            />
            <ConnectionStatus
              type="Cache Server"
              status="neutral"
              message="Not configured"
              meta="Configure Redis connection in settings"
            />
          </div>
        </section>

        {/* TestConnection Component Test */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-surface-200">
          <h2 className="text-xl font-bold text-surface-800 mb-4">TestConnection Component</h2>
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
          <h2 className="text-xl font-bold text-surface-800 mb-4">ConfigLayout Component</h2>
          <p className="text-sm text-surface-600 mb-6">Reusable tabbed configuration layout used by all modules</p>
          <ConfigLayout
            title="Module Configuration"
            subtitle="Configure module settings and connections"
            icon={Settings}
            tabs={configTabs}
            defaultTab="database"
          />
        </section>

        {/* LoginForm Component Test */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-surface-200">
          <h2 className="text-xl font-bold text-surface-800 mb-4">LoginForm Component</h2>
          <p className="text-sm text-surface-600 mb-6">Full login form with gradient background and button</p>
          <LoginForm onLogin={handleLogin} />
        </section>
      </div>
    </div>
  );
}
