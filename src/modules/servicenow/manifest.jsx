// ============================================================================
// ServiceNow Module Manifest — PulseOps V2
//
// PURPOSE: Self-describing manifest for the ServiceNow ITSM Integration module.
// The platform's module registry discovers this file and uses it to drive
// top navigation, sidebar navigation, view rendering, and configuration tabs.
// NO ServiceNow-specific code lives in the platform core — this manifest is
// the ONLY integration point between the platform and this module.
//
// ARCHITECTURE: Plug-and-play module contract.
//   - Metadata (id, name, version, roles, order) sourced from constants.json.
//   - getViews() returns Component References (NOT instances) — critical for performance.
//   - getConfigTabs() returns tab definitions with render functions for lazy mounting.
//   - All navItems follow the mandatory base-3: dashboard, config, reports.
//   - Custom navItem 'incidents' appended after the base three.
//
// HOW IT LOADS (zero-downtime plug-and-play):
//   Dev mode  → registerModulePath() in moduleRegistry.js → direct Vite import
//   Prod mode → Build: `npm run build:module servicenow`
//               Deploy: Copy dist-modules/servicenow/manifest.js to server
//               Enable: Module Manager UI → POST /api/modules/servicenow/enable
//               Load:   PlatformDashboard calls loadModuleManifest('servicenow')
//                       → fetches /api/modules/bundle/servicenow/manifest.js
//
// DEPENDENCIES:
//   - lucide-react                          → Icons
//   - @modules/servicenow/constants.json    → Module metadata (authoritative)
//   - @modules/servicenow/components/*      → View + config components
// ============================================================================

import React from 'react';
import { Headset, LayoutDashboard, BarChart3, Sliders, Wifi, Clock, RefreshCw, ListFilter } from 'lucide-react';
import moduleConstants from '@modules/servicenow/constants.json';
import uiText from '@modules/servicenow/uiText.json';

// ── View Component References (NOT instances — never call new or pass JSX) ────
import ServiceNowDashboard  from '@modules/servicenow/components/ServiceNowDashboard';
import ServiceNowIncidents  from '@modules/servicenow/components/ServiceNowIncidents';
import ServiceNowReports    from '@modules/servicenow/components/ServiceNowReports';

// ── Config Tab Components (lazy-mounted via render functions) ─────────────────
import ServiceNowConnectionTab from '@modules/servicenow/components/config/ServiceNowConnectionTab';
import ServiceNowSlaTab        from '@modules/servicenow/components/config/ServiceNowSlaTab';
import ServiceNowSyncTab       from '@modules/servicenow/components/config/ServiceNowSyncTab';

const navText = uiText.navItems;
const cfgText = uiText.config;

/** @type {import('@modules/moduleRegistry').ModuleManifest} */
const servicenowManifest = {
  // ── Authoritative metadata from constants.json ────────────────────────────
  ...moduleConstants,

  // ── Module icon (Lucide — never hardcoded string) ─────────────────────────
  icon: Headset,

  // ── Sidebar Navigation (MUST include dashboard, config, reports in this order)
  navItems: [
    { id: 'dashboard', label: navText.dashboard, icon: LayoutDashboard },
    { id: 'incidents', label: navText.incidents,  icon: ListFilter       },
    { id: 'reports',   label: navText.reports,    icon: BarChart3        },
    { id: 'config',    label: navText.config,     icon: Sliders          },
  ],

  /**
   * Returns a map of view IDs → Component References.
   * CRITICAL: Return references (Class/Function), NOT JSX elements.
   * PlatformDashboard instantiates them with props: { user, onNavigate, onModulesChanged }
   *
   * @returns {{ [viewId: string]: React.ComponentType }}
   */
  getViews: () => ({
    dashboard: ServiceNowDashboard,
    incidents: ServiceNowIncidents,
    reports:   ServiceNowReports,
  }),

  /**
   * Returns config tab definitions for the ConfigLayout component.
   * Content is a render function (() => JSX) — each tab only mounts when active.
   * This follows the lazy-rendering pattern established in Settings.jsx.
   *
   * @returns {Array<{ id, label, icon, content: () => JSX }>}
   */
  getConfigTabs: () => [
    {
      id:      cfgText.tabs.connection.id,
      label:   cfgText.tabs.connection.label,
      icon:    Wifi,
      content: () => <ServiceNowConnectionTab />,
    },
    {
      id:      cfgText.tabs.sla.id,
      label:   cfgText.tabs.sla.label,
      icon:    Clock,
      content: () => <ServiceNowSlaTab />,
    },
    {
      id:      cfgText.tabs.sync.id,
      label:   cfgText.tabs.sync.label,
      icon:    RefreshCw,
      content: () => <ServiceNowSyncTab />,
    },
  ],

  // ── ConfigLayout metadata (used by PlatformDashboard when activeView==='config') ──
  configTitle:      cfgText.title,
  configSubtitle:   cfgText.subtitle,
  configIcon:       Sliders,
  configDefaultTab: moduleConstants.configDefaultTab,
};

export default servicenowManifest;
