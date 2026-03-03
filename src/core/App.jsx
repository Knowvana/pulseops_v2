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
//   - Auth uses API endpoint (HttpOnly cookies — browser handles automatically)
//   - On login success, HttpOnly cookie is set by the API response
//
// DEPENDENCIES:
//   - react-router-dom       → BrowserRouter, Routes, Route
//   - @shared                → LoginForm
//   - @core/PlatformDashboard → Single orchestrator for all authenticated UI
//   - @config/urls.json      → API endpoint URLs
//   - @config/uiElementsText.json → UI error messages
// ============================================================================
import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginForm } from '@shared';
import PlatformDashboard from '@core/PlatformDashboard';
import urls from '@config/urls.json';
import uiText from '@config/uiElementsText.json';

const loginText = uiText.auth?.login || {};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState({});

  const handleLogin = useCallback(async (email, password) => {
    try {
      const response = await fetch(urls.auth.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();

      if (result?.success && result.data?.user) {
        setUser(result.data.user);
        setIsAuthenticated(true);
        return;
      }

      throw new Error(result?.error?.message || loginText.failed || 'Login failed');
    } catch (err) {
      throw new Error(err.message || loginText.failed || 'Login failed');
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch(urls.auth.logout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch {
      // Logout even if API call fails — clear UI state regardless
    }
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
