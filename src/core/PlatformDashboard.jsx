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
import { ButtonShowcase } from '@shared';

export default function PlatformDashboard() {
  const { moduleId, viewId } = useParams();

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Top Navigation placeholder */}
      <header className="h-14 bg-surface-900 flex items-center px-6">
        <h1 className="text-white text-sm font-bold">{globalText.platform.name}</h1>
      </header>

      {/* Main content area */}
      <main>
        <ButtonShowcase />
      </main>
    </div>
  );
}
