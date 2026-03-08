// ============================================================================
// Module Manifest Template — PulseOps V2
//
// PURPOSE: Self-describing manifest for a plug-and-play module.
// Copy this template and customize for your module.
//
// ARCHITECTURE: Plug-and-play module contract.
//   - Metadata (id, name, version, roles, order) sourced from constants.json.
//   - getViews() returns Component References (NOT instances).
//   - getConfigTabs() returns tab definitions with render functions.
//   - navItems must include 'dashboard' and 'config'.
//
// HOW IT LOADS:
//   Build: `npm run build:module <moduleId>`
//   Deploy: dist-modules/<moduleId>/ (auto-discovered by moduleScanner)
//   Enable: Module Manager UI → Install → Enable
//   Load:   PlatformDashboard fetches manifest from hot-drop URL
// ============================================================================

import React from 'react';
import { LayoutDashboard, Sliders, Wifi } from 'lucide-react';
import moduleConstants from './config/constants.json';
import uiText from './config/uiText.json';

// ── View Component References ────────────────────────────────────────────────
import Dashboard from './views/Dashboard';

// ── Config Tab Components ────────────────────────────────────────────────────
import ConnectionTab from './components/config/ConnectionTab';

const navText = uiText.navItems;
const cfgText = uiText.config;

/** @type {import('@modules/moduleRegistry').ModuleManifest} */
const manifest = {
  ...moduleConstants,

  icon: LayoutDashboard,

  navItems: [
    { id: 'dashboard', label: navText.dashboard, icon: LayoutDashboard },
    { id: 'config',    label: navText.config,    icon: Sliders },
  ],

  getViews: () => ({
    dashboard: Dashboard,
  }),

  getConfigTabs: () => [
    {
      id:      cfgText.tabs.connection.id,
      label:   cfgText.tabs.connection.label,
      icon:    Wifi,
      content: () => <ConnectionTab />,
    },
  ],

  configTitle:      cfgText.title,
  configSubtitle:   cfgText.subtitle,
  configIcon:       Sliders,
  configDefaultTab: moduleConstants.configDefaultTab,
};

export default manifest;
