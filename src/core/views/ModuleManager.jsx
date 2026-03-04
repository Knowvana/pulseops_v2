// ============================================================================
// ModuleManager — PulseOps V2 Core
//
// PURPOSE: Native core view for managing platform modules. Allows admins
// to install, enable, disable, and manage hot-drop micro-frontend modules.
// This is NOT a dynamic module — it is a hard-routed core view.
//
// ROUTE: /modules
//
// ARCHITECTURE: Reads all text from uiElementsText.json. Uses shared components
// exclusively. No inline hardcoded strings.
//
// DEPENDENCIES:
//   - @config/uiElementsText.json → All UI labels
//   - @shared → Reusable design system components
// ============================================================================
import React from 'react';
import { Package } from 'lucide-react';
import { createLogger } from '@shared';
import uiText from '@config/uiElementsText.json';

const viewText = uiText.coreViews.moduleManager;
const log = createLogger('ModuleManager.jsx');

export default function ModuleManager() {
  log.debug('render', 'Module Manager page accessed');
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <Package size={20} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-surface-800">{viewText.title}</h1>
          <p className="text-sm text-surface-500 mt-0.5">{viewText.subtitle}</p>
        </div>
      </div>

      {/* Placeholder content */}
      <div className="bg-white rounded-xl border border-surface-200 p-8 shadow-sm flex flex-col items-center justify-center">
        <Package size={40} className="text-surface-300 mb-3" />
        <h3 className="text-sm font-bold text-surface-700 mb-1">{viewText.title}</h3>
        <p className="text-xs text-surface-400 text-center max-w-sm">
          {viewText.subtitle}
        </p>
      </div>
    </div>
  );
}
