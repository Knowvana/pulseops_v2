// ============================================================================
// PlatformDashboard — PulseOps V2
//
// PURPOSE: Main authenticated UI shell. Orchestrates module loading,
// navigation, and renders the active module's view.
//
// ARCHITECTURE: Reads moduleId/viewId from URL params. Loads module
// manifests, renders top nav + side nav + main content.
//
// DEPENDENCIES:
//   - react-router-dom → useParams, useNavigate
//   - @modules/moduleRegistry → module discovery
// ============================================================================
import React from 'react';
import { useParams } from 'react-router-dom';
import globalText from '@config/globalText.json';

export default function PlatformDashboard() {
  const { moduleId, viewId } = useParams();

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Top Navigation placeholder */}
      <header className="h-14 bg-surface-900 flex items-center px-6">
        <h1 className="text-white text-sm font-bold">{globalText.platform.name}</h1>
      </header>

      {/* Main content area */}
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-surface-800 mb-2">Welcome to PulseOps V2</h2>
            <p className="text-sm text-surface-600 mb-4">
              Module: {moduleId || 'None'} | View: {viewId || 'None'}
            </p>
            <p className="text-xs text-surface-400">
              Platform dashboard is loading. Module system will be implemented here.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
