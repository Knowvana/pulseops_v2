// ============================================================================
// Module Manifest — Template Module (PulseOps V2)
//
// PURPOSE: Central export for the module. Defines metadata, navigation,
// and view component references for the Microkernel registry.
//
// ARCHITECTURE:
//   - Metadata is sourced from constants.json (authoritative).
//   - getViews() returns component references (NOT instances).
//
// DEPENDENCIES:
//   - lucide-react → Icons
//   - @modules/_template/constants.json → Module metadata
//   - @modules/_template/components/* → View components
// ============================================================================
import { LayoutDashboard, FileBarChart, Settings } from 'lucide-react';
import moduleConstants from '@modules/_template/constants.json';

// View Imports (Component References)
import TemplateDashboard from '@modules/_template/components/TemplateDashboard';
import TemplateReports from '@modules/_template/components/TemplateReports';
import TemplateConfig from '@modules/_template/components/TemplateConfig';

const templateManifest = {
  // Authoritative Metadata from constants.json
  ...moduleConstants,

  // UI Components & Icons
  icon: LayoutDashboard,

  // Sidebar Navigation Items (MUST include dashboard, config, reports)
  navItems: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'config', label: 'Configuration', icon: Settings },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
  ],

  /**
   * Returns a map of view IDs to Component References.
   * REQUIRED: Return references, not JSX elements.
   */
  getViews: () => ({
    dashboard: TemplateDashboard,
    config: TemplateConfig,
    reports: TemplateReports,
  }),

  /**
   * Optional: Returns tabs for the global settings view.
   */
  getSettingsTabs: () => [],
};

export default templateManifest;
