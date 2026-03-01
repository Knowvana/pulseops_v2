// ============================================================================
// App — PulseOps V2 Root Component
//
// PURPOSE: Root component that sets up routing and renders the platform.
// Thin orchestrator — delegates to PlatformDashboard for authenticated UI.
//
// ARCHITECTURE: Wraps the app in BrowserRouter for URL-driven navigation.
// ============================================================================
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PlatformDashboard from '@core/PlatformDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/:moduleId?/:viewId?" element={<PlatformDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
