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
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginForm, UILogService, createLogger } from '@shared';
import PlatformDashboard from '@core/PlatformDashboard';
import urls from '@config/urls.json';
import uiText from '@config/uiElementsText.json';
import messages from '@config/UIMessages.json';

const log = createLogger('App.jsx');

const loginText = uiText.auth?.login || {};
const authMessages = messages.auth;

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState({});
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const sessionCheckRan = useRef(false);

  // On mount, check if existing session cookie is still valid via /auth/me
  useEffect(() => {
    if (sessionCheckRan.current) return;
    sessionCheckRan.current = true;
    log.info('mount', 'Application mounted — checking existing session cookie');
    const checkSession = async () => {
      try {
        log.debug('checkSession', 'Sending session check request', { url: urls.auth.me });
        const response = await fetch(urls.auth.me, {
          credentials: 'include',
        });
        if (response.ok) {
          const result = await response.json();
          if (result?.success && result?.data) {
            log.info('checkSession', `Session restored from cookie — user: ${result.data.email}`);
            setUser(result.data);
            UILogService.setUserEmail(result.data.email);
            setIsAuthenticated(true);
          } else {
            log.info('checkSession', 'No valid session found — showing login form');
          }
        } else {
          log.info('checkSession', `Session check returned HTTP ${response.status} — showing login form`);
        }
      } catch (err) {
        log.info('checkSession', 'Session check failed (no server?) — showing login form');
      } finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  const handleLogin = useCallback(async (email, password) => {
    log.info('handleLogin', `Login attempt started — ${email}`, { url: urls.auth.login });
    try {
      const response = await fetch(urls.auth.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        if (response.status === 503) {
          log.error('handleLogin', 'API server unavailable (503)');
          let result;
          try {
            result = await response.json();
            throw new Error(result?.error?.message || authMessages.serverUnavailable);
          } catch (jsonError) {
            throw new Error(authMessages.serverUnavailable);
          }
        }
        if (response.status >= 500) {
          log.error('handleLogin', `Server error (${response.status})`);
          throw new Error(authMessages.serverUnavailable);
        }
        let result;
        try {
          result = await response.json();
          log.warn('handleLogin', `Login failed (${response.status})`, { message: result?.error?.message });
        } catch {
          log.error('handleLogin', 'Network error — could not parse response');
          throw new Error(authMessages.networkError);
        }
        throw new Error(result?.error?.message || authMessages.loginFailed);
      }

      let result;
      try {
        result = await response.json();
      } catch {
        log.error('handleLogin', 'Failed to parse JSON response');
        throw new Error(authMessages.networkError);
      }

      if (result?.success && result.data?.user) {
        log.info('handleLogin', `Login successful — ${result.data.user.email}`, { role: result.data.user.role });
        setUser(result.data.user);
        UILogService.setUserEmail(result.data.user.email);
        setIsAuthenticated(true);
        return;
      }

      log.error('handleLogin', 'Login failed — invalid response structure');
      throw new Error(result?.error?.message || authMessages.loginFailed);
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        log.error('handleLogin', 'Network error — fetch failed', { message: err.message });
        throw new Error(authMessages.serverUnavailable);
      }
      log.error('handleLogin', err.message);
      throw err;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    log.info('handleLogout', 'Logout initiated');
    try {
      await fetch(urls.auth.logout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      log.info('handleLogout', 'Logout successful — clearing session');
    } catch (err) {
      log.warn('handleLogout', 'Logout API call failed — clearing UI state anyway', { message: err.message });
    }
    UILogService.setUserEmail(null);
    setIsAuthenticated(false);
    setUser({});
    log.info('handleLogout', 'User logged out — showing login form');
  }, []);

  // Show loading spinner while checking session cookie on refresh
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 via-brand-50 to-cyan-50">
        <div className="w-8 h-8 border-3 border-brand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
