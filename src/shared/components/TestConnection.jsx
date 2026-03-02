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
import React, { useState, useEffect } from 'react';
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
  autoTest = false,
}) {
  const [config, setConfig] = useState(() => {
    const initial = {};
    fields.forEach(field => {
      initial[field.name] = initialConfig[field.name] || field.defaultValue || '';
    });
    return initial;
  });

  const [connectionStatus, setConnectionStatus] = useState({
    type: title,
    status: 'neutral',
    message: 'Ready to test connection',
    meta: null,
    lastTested: null,
  });
  const [lastTestedTime, setLastTestedTime] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});

  const handleFieldChange = (name, value) => {
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleTest = async () => {
    if (!onTest) return;

    setIsTesting(true);
    setConnectionStatus({
      type: title,
      status: 'loading',
      message: 'Testing connection...',
      meta: null,
      lastTested: null,
    });

    try {
      const result = await onTest(config);
      const now = new Date();
      const timeString = now.toLocaleString();
      setLastTestedTime(timeString);
      
      if (result.success) {
        setConnectionStatus({
          type: title,
          status: 'success',
          message: result.message || 'Connection successful',
          meta: result.meta || null,
          lastTested: timeString,
        });
      } else {
        setConnectionStatus({
          type: title,
          status: 'error',
          message: result.message || 'Connection failed',
          meta: result.meta || null,
          lastTested: timeString,
        });
      }
    } catch (error) {
      const now = new Date();
      const timeString = now.toLocaleString();
      setLastTestedTime(timeString);
      
      setConnectionStatus({
        type: title,
        status: 'error',
        message: error.message || 'Connection test failed',
        meta: null,
        lastTested: timeString,
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

  // Auto-test on mount when autoTest prop is true
  useEffect(() => {
    if (autoTest && onTest) {
      const runAutoTest = async () => {
        setIsTesting(true);
        setConnectionStatus({
          type: title,
          status: 'loading',
          message: 'Testing connection...',
          meta: null,
          lastTested: null,
        });
        try {
          const result = await onTest(config);
          const timeString = new Date().toLocaleString();
          setLastTestedTime(timeString);
          if (result.success) {
            setConnectionStatus({
              type: title,
              status: 'success',
              message: result.message || 'Connection successful',
              meta: result.meta || null,
              lastTested: timeString,
            });
          } else {
            setConnectionStatus({
              type: title,
              status: 'error',
              message: result.message || 'Connection failed',
              meta: result.meta || null,
              lastTested: timeString,
            });
          }
        } catch (error) {
          const timeString = new Date().toLocaleString();
          setLastTestedTime(timeString);
          setConnectionStatus({
            type: title,
            status: 'error',
            message: error.message || 'Connection test failed',
            meta: null,
            lastTested: timeString,
          });
        } finally {
          setIsTesting(false);
        }
      };
      runAutoTest();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePasswordVisibility = (fieldName) => {
    setShowPasswords(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <ConnectionStatus
        type={connectionStatus.type}
        status={connectionStatus.status}
        message={connectionStatus.message}
        meta={connectionStatus.meta}
        lastTested={connectionStatus.lastTested}
        showBadge={true}
      />

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
