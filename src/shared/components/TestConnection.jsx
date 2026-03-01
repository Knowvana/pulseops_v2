// ============================================================================
// TestConnection — PulseOps V2 Design System
//
// PURPOSE: Reusable component for testing connections to external services.
// Displays connection configuration form, test button, and uses ConnectionStatus
// to show results. Can be used by any module to test database, API, or service
// connections.
//
// USAGE:
//   import { TestConnection } from '@shared';
//   <TestConnection
//     title="Database Connection"
//     description="Configure and test PostgreSQL connection"
//     fields={[
//       { name: 'host', label: 'Host', placeholder: 'localhost', type: 'text' },
//       { name: 'port', label: 'Port', placeholder: '5432', type: 'text' },
//       { name: 'database', label: 'Database', placeholder: 'mydb', type: 'text' },
//       { name: 'username', label: 'Username', placeholder: 'postgres', type: 'text' },
//       { name: 'password', label: 'Password', placeholder: '••••••', type: 'password' }
//     ]}
//     onTest={async (config) => {
//       // Return { success: true, message: '...', meta: '...' } or throw error
//       const result = await testDatabaseConnection(config);
//       return result;
//     }}
//     onSave={async (config) => {
//       await saveConfiguration(config);
//     }}
//   />
//
// PROPS:
//   title       — Connection title (e.g., "Database Connection")
//   description — Description text
//   icon        — Lucide icon component (optional)
//   fields      — Array of { name, label, placeholder, type, defaultValue? }
//   onTest      — Async function to test connection, returns { success, message, meta? }
//   onSave      — Async function to save configuration (optional)
//   initialConfig — Initial configuration object (optional)
//
// ARCHITECTURE: Fully reusable, accepts any field configuration. Uses
// ConnectionStatus component to display test results.
// ============================================================================
import React, { useState } from 'react';
import { Database, RefreshCw, Save, Eye, EyeOff } from 'lucide-react';
import { Button } from '@shared';
import ConnectionStatus from '@shared/components/ConnectionStatus';

export default function TestConnection({
  title = 'Connection Test',
  description = 'Configure and test connection',
  icon: Icon = Database,
  fields = [],
  onTest,
  onSave,
  initialConfig = {},
}) {
  const [config, setConfig] = useState(() => {
    const initial = {};
    fields.forEach(field => {
      initial[field.name] = initialConfig[field.name] || field.defaultValue || '';
    });
    return initial;
  });

  const [connectionStatus, setConnectionStatus] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});

  const handleFieldChange = (name, value) => {
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleTest = async () => {
    if (!onTest) return;

    setIsTesting(true);
    setConnectionStatus(null);

    try {
      const result = await onTest(config);
      
      if (result.success) {
        setConnectionStatus({
          type: title,
          status: 'success',
          message: result.message || 'Connection successful',
          meta: result.meta || null,
        });
      } else {
        setConnectionStatus({
          type: title,
          status: 'error',
          message: result.message || 'Connection failed',
          meta: result.meta || null,
        });
      }
    } catch (error) {
      setConnectionStatus({
        type: title,
        status: 'error',
        message: error.message || 'Connection test failed',
        meta: null,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(config);
      setConnectionStatus({
        type: 'Configuration',
        status: 'success',
        message: 'Configuration saved successfully',
        meta: null,
      });
    } catch (error) {
      setConnectionStatus({
        type: 'Configuration',
        status: 'error',
        message: error.message || 'Failed to save configuration',
        meta: null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const togglePasswordVisibility = (fieldName) => {
    setShowPasswords(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-brand-50 to-teal-50 border border-brand-200/50">
        <div className="p-2 rounded-lg bg-white shadow-sm">
          <Icon size={18} className="text-brand-500" />
        </div>
        <div>
          <p className="text-xs font-bold text-surface-800">{title}</p>
          <p className="text-[10px] text-surface-500">{description}</p>
        </div>
      </div>

      {/* Configuration Fields */}
      <div className="space-y-3">
        {fields.map((field) => {
          const isPassword = field.type === 'password';
          const showPassword = showPasswords[field.name];
          const inputType = isPassword && !showPassword ? 'password' : 'text';

          return (
            <div key={field.name}>
              <label className="block text-xs font-semibold text-surface-600 mb-1">
                {field.label}
              </label>
              <div className="relative">
                <input
                  type={inputType}
                  value={config[field.name]}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-sm border-2 border-surface-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 transition-all"
                />
                {isPassword && (
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(field.name)}
                    className="absolute inset-y-0 right-2 flex items-center text-surface-400 hover:text-surface-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connection Status */}
      {connectionStatus && (
        <ConnectionStatus
          type={connectionStatus.type}
          status={connectionStatus.status}
          message={connectionStatus.message}
          meta={connectionStatus.meta}
        />
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {onTest && (
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw />}
            onClick={handleTest}
            isLoading={isTesting}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
        )}
        {onSave && (
          <Button
            variant="primary"
            size="sm"
            icon={<Save />}
            onClick={handleSave}
            isLoading={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        )}
      </div>
    </div>
  );
}
