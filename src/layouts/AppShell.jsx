// ============================================================================
// AppShell — PulseOps V2 Layout
//
// PURPOSE: The master layout that composes the entire authenticated UI.
// Composes: TopMenu (top) + LeftSideNavBar (left, collapsible) +
// MainContent (center) + RightLogsView (slide-out, right).
//
// ARCHITECTURE: Module-agnostic. Receives modules[], sideNavItems[],
// children for the active page content. ZERO module-specific code lives
// here — all module data flows through props from PlatformDashboard.
//
// LAYOUT STRUCTURE:
//   ┌──────────────────────────────────────────────────┐
//   │              TopMenu (fixed)             [👤][📊]│
//   ├────────┬────────────────────────┬───────────────┤
//   │        │                        │  RightPanel   │
//   │SideNav │     Main Content       │  (slide-out)  │
//   │  (◀▶)  │     (children)         │  Logs|API     │
//   │        │                        │               │
//   └────────┴────────────────────────┴───────────────┘
//
// USED BY: PlatformDashboard.jsx (wraps all authenticated content)
//
// DEPENDENCIES:
//   - @layouts/TopMenu
//   - @layouts/LeftSideNavBar
//   - @layouts/RightLogsView
// ============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import TopMenu from '@layouts/TopMenu';
import LeftSideNavBar from '@layouts/LeftSideNavBar';
import RightLogsView from '@layouts/RightLogsView';
import { UILogService } from '@shared';

export default function AppShell({
  appName,
  modules = [],
  activeModuleId,
  onSwitchModule,
  onLogout,
  user,

  sideNavTitle,
  sideNavItems = [],
  activeSideNavItemId,
  onSelectSideNavItem,
  sideNavCollapsed: controlledCollapsed,
  onToggleSideNav: controlledToggle,

  children,
}) {
  const hasSideNav = sideNavItems.length > 0;

  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const sideNavCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const onToggleSideNav = controlledToggle || (() => setInternalCollapsed((c) => !c));

  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [uiLogs, setUiLogs] = useState([]);
  const [apiCalls, setApiCalls] = useState([]);

  // Initialize UILogService and subscribe for updates
  useEffect(() => {
    UILogService.init();
    const unsub = UILogService.subscribe(({ logs, apiCalls: calls }) => {
      setUiLogs(logs);
      setApiCalls(calls);
    });
    return () => {
      unsub();
      UILogService.destroy();
    };
  }, []);

  const handleClearLogs = useCallback(() => UILogService.clearLogs(), []);
  const handleClearApiCalls = useCallback(() => UILogService.clearApiCalls(), []);

  return (
    <div className="h-screen flex flex-col bg-surface-50 font-sans text-surface-800 overflow-hidden">
      {/* Top Navigation */}
      <TopMenu
        appName={appName}
        modules={modules}
        activeModuleId={activeModuleId}
        onSwitchModule={onSwitchModule}
        onLogout={onLogout}
        user={user}
        onToggleRightPanel={() => setIsRightPanelOpen((o) => !o)}
        isRightPanelOpen={isRightPanelOpen}
      />

      {/* Body: SideNav + Main Content + RightPanel */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {hasSideNav && (
          <LeftSideNavBar
            title={sideNavTitle}
            items={sideNavItems}
            activeItemId={activeSideNavItemId}
            onSelectItem={onSelectSideNavItem}
            collapsed={sideNavCollapsed}
            onToggleCollapse={onToggleSideNav}
          />
        )}

        <main className="flex-1 overflow-hidden">
          <div className="w-full h-full px-6 py-6 overflow-y-auto">
            {children}
          </div>
        </main>

        {/* Right Panel (Logs, API) — inline */}
        <RightLogsView
          isOpen={isRightPanelOpen}
          onClose={() => setIsRightPanelOpen(false)}
          logs={uiLogs}
          apiCalls={apiCalls}
          onClearLogs={handleClearLogs}
          onClearApiCalls={handleClearApiCalls}
        />
      </div>
    </div>
  );
}
