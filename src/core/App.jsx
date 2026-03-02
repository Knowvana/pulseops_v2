// ============================================================================
// App — PulseOps V2 Root Component
//
// PURPOSE: Root component that handles authentication and routes between
// the login form and PlatformDashboard. Thin orchestrator — delegates
// all authenticated UI to PlatformDashboard.
//
// ARCHITECTURE:
//   - BrowserRouter wraps PlatformDashboard for URL-driven navigation
//   - PlatformDashboard handles ALL routing (core Admin + dynamic modules)
//   - Login form renders outside the router when not authenticated
//   - Auth uses JSON file-based credentials from app.json (default mode)
//
// DEPENDENCIES:
//   - react-router-dom       → BrowserRouter, Routes, Route
//   - @shared                → LoginForm
//   - @core/PlatformDashboard → Single orchestrator for all authenticated UI
//   - @config/app.json       → Default admin credentials
// ============================================================================
import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginForm } from '@shared';
import PlatformDashboard from '@core/PlatformDashboard';
import appConfig from '@config/app.json';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState({});

  const handleLogin = useCallback(async (email, password) => {
    const defaultAdmin = appConfig.coreAuth?.defaultAdmin || {};
    if (email === defaultAdmin.email && password === defaultAdmin.password) {
      setUser({ email: defaultAdmin.email, role: defaultAdmin.role });
      setIsAuthenticated(true);
      return;
    }
    throw new Error('Invalid credentials');
  }, []);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setUser({});
  }, []);

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/:moduleId/:viewId" element={<PlatformDashboard user={user} onLogout={handleLogout} />} />
        <Route path="/:moduleId" element={<PlatformDashboard user={user} onLogout={handleLogout} />} />
        <Route path="/" element={<PlatformDashboard user={user} onLogout={handleLogout} />} />
      </Routes>
    </BrowserRouter>
  );
}
