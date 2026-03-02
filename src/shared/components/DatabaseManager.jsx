// ============================================================================
// DatabaseManager — PulseOps V2 Design System
//
// PURPOSE: Reusable component for managing database schema, default data,
// and database operations. Allows modules to setup their database schema,
// delete database, manage default data, and perform wipe operations.
//
// USAGE:
//   import { DatabaseManager } from '@shared';
//   <DatabaseManager
//     onCreateDatabase={async () => await createDb()}
//     onDeleteDatabase={async () => await deleteDb()}
//     onInitializeSchema={async () => await initSchema()}
//     onLoadDefaultData={async () => await loadData()}
//     onCleanDefaultData={async () => await cleanData()}
//     onWipeDatabase={async () => await wipeDb()}
//     onRefreshStatus={async () => await checkStatus()}
//     dbStatus={{ connected: true, exists: true, schemaInitialized: true, hasDefaultData: false }}
//   />
//
// PROPS:
//   onCreateDatabase      — Async function to create database (required)
//   onDeleteDatabase      — Async function to delete database (required)
//   onInitializeSchema    — Async function to initialize schema (required)
//   onLoadDefaultData     — Async function to load default data (required)
//   onCleanDefaultData    — Async function to clean default data (required)
//   onWipeDatabase        — Async function to wipe database (required)
//   onRefreshStatus       — Async function to refresh status (required)
//   dbStatus              — Object with { connected, exists, schemaInitialized, hasDefaultData } (required)
//   isLoading             — Loading state (optional)
//
// ARCHITECTURE: Fully reusable and config-based. Uses ConfirmationModal for
// all destructive operations. All text and actions passed as props.
// ============================================================================
import React, { useState } from 'react';
import { Database, RefreshCw, AlertTriangle, CheckCircle2, Download, Trash2 } from 'lucide-react';
import { Button, ConfirmationModal } from '@shared';

export default function DatabaseManager({
  onCreateDatabase,
  onDeleteDatabase,
  onInitializeSchema,
  onLoadDefaultData,
  onCleanDefaultData,
  onWipeDatabase,
  onRefreshStatus,
  dbStatus = { connected: false, exists: false, schemaInitialized: false, hasDefaultData: false },
  isLoading = false,
}) {
  const [modalState, setModalState] = useState({ type: null, open: false });

  const openModal = (type) => setModalState({ type, open: true });
  const closeModal = () => setModalState({ type: null, open: false });

  const handleSuccess = async () => {
    closeModal();
    await onRefreshStatus?.();
  };

  return (
    <div className="space-y-6">
      {/* Database Instance Status */}
      {!dbStatus.exists ? (
        <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50 rounded-xl border border-pink-200 p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-pink-100 to-rose-100 rounded-lg shrink-0">
              <AlertTriangle size={16} className="text-pink-600" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-pink-800 mb-1">Database Not Found</h4>
              <p className="text-[11px] text-pink-700 leading-relaxed">
                The database instance does not exist. Create it to continue.
              </p>
            </div>
          </div>
          <Button 
            variant="primary" 
            size="sm" 
            icon={<Database />} 
            onClick={() => openModal('createDb')}
            className="bg-pink-600 hover:bg-pink-700"
          >
            Create Database
          </Button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-50/50 to-teal-50/30 rounded-xl border border-emerald-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg">
                <Database size={16} className="text-emerald-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-surface-700">Database Instance</h4>
                <p className="text-[11px] text-surface-500">Database is ready and connected</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-600">Exists</span>
          </div>
        </div>
      )}

      {/* Schema Status */}
      <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400">Schema Status</h4>
          <span className={`text-xs font-bold ${dbStatus.schemaInitialized ? 'text-emerald-600' : 'text-amber-600'}`}>
            {dbStatus.schemaInitialized ? 'Initialized' : 'Not Initialized'}
          </span>
        </div>

        {!dbStatus.schemaInitialized ? (
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 rounded-xl border border-amber-200 p-4 mb-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg shrink-0">
                <AlertTriangle size={16} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-800 mb-1">Schema Not Initialized</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Initialize the database schema to create required tables and structures.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 mb-3">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">Schema is ready</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {!dbStatus.schemaInitialized && (
            <Button 
              variant="primary" 
              size="sm" 
              icon={<Database />} 
              onClick={() => openModal('initSchema')}
              disabled={!dbStatus.exists}
            >
              Initialize Schema
            </Button>
          )}
          <Button variant="secondary" size="sm" icon={<RefreshCw />} onClick={onRefreshStatus} isLoading={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Default Data */}
      <div className="bg-white rounded-xl border border-surface-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400">Default Data</h4>
          <span className={`text-xs font-bold ${dbStatus.hasDefaultData ? 'text-emerald-600' : 'text-amber-600'}`}>
            {dbStatus.hasDefaultData ? 'Loaded' : 'Not Loaded'}
          </span>
        </div>
        <p className="text-xs text-surface-500 mb-3">
          Load default data including admin users, roles, and initial configuration.
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant={dbStatus.hasDefaultData ? 'secondary' : 'primary'}
            size="sm"
            icon={<Download />}
            onClick={() => openModal('loadData')}
            disabled={!dbStatus.schemaInitialized}
          >
            {dbStatus.hasDefaultData ? 'Reload Default Data' : 'Load Default Data'}
          </Button>
          {dbStatus.hasDefaultData && (
            <Button 
              variant="ghost" 
              size="sm" 
              icon={<Trash2 />} 
              onClick={() => openModal('cleanData')}
              className="text-rose-600 hover:bg-rose-50"
            >
              Clean Data
            </Button>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-gradient-to-r from-rose-50/50 to-red-50/30 rounded-xl border border-rose-200 p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-rose-100 to-red-100 rounded-lg shrink-0">
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">Danger Zone</h4>
            <p className="text-xs text-surface-500">Destructive operations that cannot be undone</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="danger" 
            size="sm" 
            icon={<Trash2 />} 
            onClick={() => openModal('wipeDb')}
            disabled={!dbStatus.exists || !dbStatus.schemaInitialized}
          >
            Wipe Database
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            icon={<Trash2 />} 
            onClick={() => openModal('deleteDb')}
            disabled={!dbStatus.exists}
          >
            Delete Database
          </Button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={modalState.open && modalState.type === 'createDb'}
        onClose={closeModal}
        title="Create Database"
        confirmMessage="Are you sure you want to create the database instance?"
        confirmLabel="Create"
        action={onCreateDatabase}
        onSuccess={handleSuccess}
        variant="info"
        buildSummary={(data) => [
          { label: 'Database', value: data?.database || 'pulseops_v2' },
          { label: 'Status', value: 'Created successfully' },
        ]}
      />

      <ConfirmationModal
        isOpen={modalState.open && modalState.type === 'deleteDb'}
        onClose={closeModal}
        title="Delete Database"
        confirmMessage="Are you sure you want to delete the database? This will permanently remove all data and cannot be undone."
        confirmLabel="Delete"
        action={onDeleteDatabase}
        onSuccess={handleSuccess}
        variant="danger"
        buildSummary={(data) => [
          { label: 'Database', value: data?.database || 'pulseops_v2' },
          { label: 'Status', value: 'Deleted successfully' },
        ]}
      />

      <ConfirmationModal
        isOpen={modalState.open && modalState.type === 'initSchema'}
        onClose={closeModal}
        title="Initialize Schema"
        confirmMessage="Are you sure you want to initialize the database schema? This will create all required tables and structures."
        confirmLabel="Initialize"
        action={onInitializeSchema}
        onSuccess={handleSuccess}
        variant="info"
        buildSummary={(data) => [
          { label: 'Tables Created', value: data?.tables?.join(', ') || 'All tables' },
          { label: 'Status', value: 'Schema initialized' },
        ]}
      />

      <ConfirmationModal
        isOpen={modalState.open && modalState.type === 'loadData'}
        onClose={closeModal}
        title="Load Default Data"
        confirmMessage="Are you sure you want to load default data? This will add admin users, roles, and initial configuration."
        confirmLabel="Load Data"
        action={onLoadDefaultData}
        onSuccess={handleSuccess}
        variant="info"
        buildSummary={() => [
          { label: 'Status', value: 'Default data loaded successfully' },
        ]}
      />

      <ConfirmationModal
        isOpen={modalState.open && modalState.type === 'cleanData'}
        onClose={closeModal}
        title="Clean Default Data"
        confirmMessage="Are you sure you want to clean default data? This will remove all default entries."
        confirmLabel="Clean"
        action={onCleanDefaultData}
        onSuccess={handleSuccess}
        variant="warning"
        buildSummary={() => [
          { label: 'Status', value: 'Default data cleaned successfully' },
        ]}
      />

      <ConfirmationModal
        isOpen={modalState.open && modalState.type === 'wipeDb'}
        onClose={closeModal}
        title="Wipe Database"
        confirmMessage="Are you sure you want to wipe the database? This will delete all data and drop all tables. This action cannot be undone."
        confirmLabel="Wipe"
        action={onWipeDatabase}
        onSuccess={handleSuccess}
        variant="danger"
        buildSummary={() => [
          { label: 'Status', value: 'Database wiped successfully' },
        ]}
      />
    </div>
  );
}
