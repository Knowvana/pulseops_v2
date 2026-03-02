// ============================================================================
// PlatformDashboard — PulseOps V2 (Core)
//
// PURPOSE: The root orchestrator for the authenticated UI. Manages both
// core Admin views AND dynamic hot-drop module views. Fetches enabled
// modules from the database, dynamically loads their manifests, and
// renders the active view inside AppShell.
//
// CORE ADMIN: "Admin" is always the first tab — its views (Dashboard,
// ModuleManager, LogManager, Settings) are defined here in core, NOT
// as a module manifest. These are native platform views.
//
// DYNAMIC MODULES: When enabled from Module Manager, hot-drop modules
// appear as additional tabs after Admin. Their manifests are loaded
// dynamically via moduleRegistry — NO rebuild or downtime needed.
//
// ZERO-DOWNTIME MODULE ADDITION:
//   1. On mount, fetches enabled module list from DB (when API available)
//   2. Dynamically loads manifests for enabled add-on modules via import()
//   3. Core Admin tab is always present (hardcoded first tab)
//   4. Dynamic module tabs appear after Admin
//   5. Active module's navItems drive the SideNav
//   6. Active view renders in the center content area
//
// DEPENDENCIES:
//   - react-router-dom          → useNavigate, useParams
//   - @layouts                  → AppShell
//   - @core/views/*             → Native core views
//   - @modules/moduleRegistry   → Dynamic module loading
//   - @config/globalText.json   → All UI text
//   - @config/app.json          → App name, default credentials
// ============================================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard, Package, ScrollText, Settings as SettingsIcon, Shield
} from 'lucide-react';
import { AppShell } from '@layouts';
import { getAllManifests, getManifestById, loadModuleManifests } from '@modules/moduleRegistry';
import { ConfigLayout } from '@shared';
import AdminDashboard from '@core/views/AdminDashboard';
import ModuleManager from '@core/views/ModuleManager';
import LogManager from '@core/views/LogManager';
import Settings from '@core/views/Settings';
import appConfig from '@config/app.json';
import globalText from '@config/globalText.json';

const coreNav = globalText.coreNav;

// ── Core Admin definition (NOT a module — hardcoded first tab) ──────────────
const CORE_ADMIN = {
  id: 'platform_admin',
  name: 'Admin',
  icon: Shield,
  isCore: true,
  order: 0,
  defaultView: 'dashboard',
  navItems: [
    { id: 'dashboard', label: coreNav.dashboard, icon: LayoutDashboard },
    { id: 'moduleManager', label: coreNav.moduleManager, icon: Package },
    { id: 'logs', label: coreNav.logs, icon: ScrollText },
    { id: 'Settings', label: coreNav.settings, icon: SettingsIcon },
  ],
  views: {
    dashboard: AdminDashboard,
    moduleManager: ModuleManager,
    logs: LogManager,
    Settings: Settings,
  },
};

export default function PlatformDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const { moduleId: urlModuleId, viewId: urlViewId } = useParams();

  const [dbModules, setDbModules] = useState([]);
  const [activeModuleId, setActiveModuleId] = useState(urlModuleId || CORE_ADMIN.id);
  const [activeView, setActiveView] = useState(urlViewId || CORE_ADMIN.defaultView);
  const [modulesLoading, setModulesLoading] = useState(true);

  // ── Fetch enabled modules from database + load manifests ──────────────────
  const fetchModules = useCallback(async () => {
    setModulesLoading(true);
    try {
      // TODO: Replace with ApiClient.get(urls.modules) when backend is ready
      // For now, no add-on modules — only core Admin
      setDbModules([]);
    } catch (err) {
      console.warn('[PlatformDashboard] Failed to fetch modules:', err.message);
    } finally {
      setModulesLoading(false);
    }
  }, []);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  // ── Build available modules: Core Admin + dynamic add-ons ─────────────────
  const availableModules = useMemo(() => {
    const dynamicManifests = getAllManifests();

    const dynamicTabs = dynamicManifests
      .filter(m => m.enabled !== false)
      .map(manifest => ({
        id: manifest.id,
        name: manifest.shortName || manifest.name,
        icon: manifest.icon,
        isCore: false,
        order: manifest.order || 99,
      }))
      .sort((a, b) => a.order - b.order);

    return [CORE_ADMIN, ...dynamicTabs];
  }, [dbModules, modulesLoading]);

  // ── Sync URL params with state ────────────────────────────────────────────
  useEffect(() => {
    if (urlModuleId && urlModuleId !== activeModuleId) {
      setActiveModuleId(urlModuleId);
    }
    if (urlViewId && urlViewId !== activeView) {
      setActiveView(urlViewId);
    }
  }, [urlModuleId, urlViewId]);

  // ── Auto-select Admin on initial load if no URL params ────────────────────
  useEffect(() => {
    if (!urlModuleId) {
      navigate(`/${CORE_ADMIN.id}/${CORE_ADMIN.defaultView}`, { replace: true });
    }
  }, [urlModuleId, navigate]);

  // ── Resolve active module data ────────────────────────────────────────────
  const isAdminActive = activeModuleId === CORE_ADMIN.id;
  const activeManifest = isAdminActive ? null : getManifestById(activeModuleId);
  const activeModuleName = isAdminActive
    ? CORE_ADMIN.name
    : (availableModules.find(m => m.id === activeModuleId)?.name || '');

  // ── SideNav items from active module ──────────────────────────────────────
  const sideNavItems = useMemo(() => {
    if (isAdminActive) return CORE_ADMIN.navItems;
    if (activeManifest?.navItems) return activeManifest.navItems;
    return [];
  }, [isAdminActive, activeManifest]);

  // ── Module switching ──────────────────────────────────────────────────────
  const handleSwitchModule = useCallback((moduleId) => {
    if (moduleId === CORE_ADMIN.id) {
      navigate(`/${CORE_ADMIN.id}/${CORE_ADMIN.defaultView}`);
    } else {
      const manifest = getManifestById(moduleId);
      const defaultView = manifest?.defaultView || 'dashboard';
      navigate(`/${moduleId}/${defaultView}`);
    }
  }, [navigate]);

  // ── SideNav item selection ────────────────────────────────────────────────
  const handleSideNavSelect = useCallback((viewId) => {
    if (activeModuleId) {
      navigate(`/${activeModuleId}/${viewId}`);
    }
  }, [activeModuleId, navigate]);

  // ── Render active content ─────────────────────────────────────────────────
  const renderContent = useCallback(() => {
    // Core Admin views
    if (isAdminActive) {
      const ViewComponent = CORE_ADMIN.views[activeView];
      if (ViewComponent) {
        return <ViewComponent user={user} onModulesChanged={fetchModules} />;
      }
      // Fallback to dashboard
      const FallbackView = CORE_ADMIN.views[CORE_ADMIN.defaultView];
      return FallbackView ? <FallbackView user={user} onModulesChanged={fetchModules} /> : null;
    }

    // Dynamic module views
    if (!activeManifest) return null;

    // Settings/config view (tabbed)
    if (activeView === 'config' && activeManifest.getConfigTabs) {
      const tabs = typeof activeManifest.getConfigTabs === 'function'
        ? activeManifest.getConfigTabs() : activeManifest.getConfigTabs;
      return (
        <ConfigLayout
          title={activeManifest.configTitle}
          subtitle={activeManifest.configSubtitle}
          icon={activeManifest.configIcon}
          tabs={tabs}
          defaultTab={activeManifest.configDefaultTab}
        />
      );
    }

    if (activeManifest.getViews) {
      const views = activeManifest.getViews();
      const ViewComponent = views[activeView] || views[activeManifest.defaultView];
      if (!ViewComponent) return null;
      return <ViewComponent user={user} onNavigate={handleSideNavSelect} onModulesChanged={fetchModules} />;
    }

    return null;
  }, [isAdminActive, activeManifest, activeView, user, handleSideNavSelect, fetchModules]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell
      appName={appConfig.appName || 'PulseOps'}
      modules={availableModules}
      activeModuleId={activeModuleId}
      onSwitchModule={handleSwitchModule}
      onLogout={onLogout}
      user={user}
      sideNavTitle={activeModuleName}
      sideNavItems={sideNavItems}
      activeSideNavItemId={activeView}
      onSelectSideNavItem={handleSideNavSelect}
    >
      {renderContent()}
    </AppShell>
  );
}
