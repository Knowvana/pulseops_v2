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
import { LoginForm, UILogService } from '@shared';
import PlatformDashboard from '@core/PlatformDashboard';
import urls from '@config/urls.json';
import uiText from '@config/uiElementsText.json';
import messages from '@config/UIMessages.json';

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
    console.log('🚀 [App] Application mounted — checking existing session cookie');
    const checkSession = async () => {
      try {
        console.log('🔄 [App] Sending session check request to', urls.auth.me);
        const response = await fetch(urls.auth.me, {
          credentials: 'include',
        });
        if (response.ok) {
          const result = await response.json();
          if (result?.success && result?.data) {
            console.log('✅ [App] Session restored from cookie — user:', result.data.email);
            setUser(result.data);
            UILogService.setUserEmail(result.data.email);
            setIsAuthenticated(true);
          } else {
            console.log('ℹ️ [App] No valid session found — showing login form');
          }
        } else {
          console.log(`ℹ️ [App] Session check returned HTTP ${response.status} — showing login form`);
        }
      } catch (err) {
        console.log('ℹ️ [App] Session check failed (no server?) — showing login form');
      } finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  const handleLogin = useCallback(async (email, password) => {
    console.log('🔐 [Frontend] Login attempt started', { email, url: urls.auth.login });
    
    try {
      console.log('📡 [Frontend] Sending POST request to', urls.auth.login);
      const response = await fetch(urls.auth.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      console.log(`📥 [Frontend] Response received - Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        // 503 Service Unavailable - Backend server is not running
        if (response.status === 503) {
          console.error('❌ [Frontend] API server unavailable (503)');
          let result;
          try {
            result = await response.json();
            console.error('❌ [Frontend] Error details:', result?.error);
            throw new Error(result?.error?.message || authMessages.serverUnavailable);
          } catch (jsonError) {
            console.error('❌ [Frontend] Could not parse error response');
            throw new Error(authMessages.serverUnavailable);
          }
        }
        
        // 500+ Server errors
        if (response.status >= 500) {
          console.error(`❌ [Frontend] Server error (${response.status})`);
          throw new Error(authMessages.serverUnavailable);
        }
        
        // Try to parse error response for 4xx errors
        let result;
        try {
          result = await response.json();
          console.warn(`⚠️ [Frontend] Login failed (${response.status}):`, result?.error?.message);
        } catch {
          console.error('❌ [Frontend] Network error - could not parse response');
          throw new Error(authMessages.networkError);
        }
        
        throw new Error(result?.error?.message || authMessages.loginFailed);
      }

      let result;
      try {
        result = await response.json();
        console.log('✅ [Frontend] Response parsed successfully:', { 
          success: result.success, 
          hasUser: !!result.data?.user,
          user: result.data?.user ? { email: result.data.user.email, role: result.data.user.role } : null
        });
      } catch {
        console.error('❌ [Frontend] Failed to parse JSON response');
        throw new Error(authMessages.networkError);
      }

      if (result?.success && result.data?.user) {
        console.log('✅ [Frontend] Login successful! Setting user state:', result.data.user);
        setUser(result.data.user);
        UILogService.setUserEmail(result.data.user.email);
        setIsAuthenticated(true);
        console.log('✅ [Frontend] User authenticated, redirecting to dashboard...');
        return;
      }

      console.error('❌ [Frontend] Login failed - invalid response structure');
      throw new Error(result?.error?.message || authMessages.loginFailed);
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        console.error('❌ [Frontend] Network error - fetch failed:', err.message);
        throw new Error(authMessages.serverUnavailable);
      }
      console.error('❌ [Frontend] Login error:', err.message);
      throw err;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    console.log('🔓 [App] Logout initiated');
    try {
      await fetch(urls.auth.logout, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      console.log('✅ [App] Logout API call successful — clearing session');
    } catch (err) {
      console.warn('⚠️ [App] Logout API call failed — clearing UI state anyway:', err.message);
    }
    UILogService.setUserEmail(null);
    setIsAuthenticated(false);
    setUser({});
    console.log('✅ [App] User logged out — showing login form');
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
