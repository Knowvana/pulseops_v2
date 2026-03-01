// ============================================================================
// TemplateConfig — PulseOps V2 Module Template
//
// PURPOSE: Module-specific configuration using the shared SettingsConfig
// component (vertical tabbed layout).
//
// ARCHITECTURE: Demonstrates how to pass custom tabs to the vertical-tab layout.
//
// DEPENDENCIES:
//   - @shared → SettingsConfig (when created)
//   - lucide-react → Icons
//   - @modules/_template/uiText.json → UI strings
// ============================================================================
import React from 'react';
import { Settings, Shield } from 'lucide-react';
import uiText from '@modules/_template/uiText.json';

export default function TemplateConfig() {
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-surface-800 mb-1">{uiText.config.title}</h2>
      <p className="text-sm text-surface-500 mb-6">{uiText.config.subtitle}</p>
      <div className="grid grid-cols-[200px_1fr] gap-4">
        {/* Left: Vertical tabs */}
        <div className="space-y-1">
          {Object.entries(uiText.config.tabs).map(([id, tab]) => (
            <button
              key={id}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-surface-600 hover:bg-surface-100"
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Right: Tab content */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <p className="text-surface-400 text-sm">{uiText.config.tabs.general.description}</p>
        </div>
      </div>
    </div>
  );
}
