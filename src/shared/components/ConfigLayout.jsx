// ============================================================================
// ConfigLayout — PulseOps V2 Design System
//
// PURPOSE: Reusable tabbed configuration panel with vertical tab list on the
// left and content area on the right. Used by all modules for Configuration
// and Settings views to maintain consistent UI across the platform.
//
// USAGE:
//   import { ConfigLayout } from '@shared';
//   <ConfigLayout
//     title="Module Configuration"
//     subtitle="Configure module settings"
//     icon={Settings}
//     tabs={[
//       { id: 'general', label: 'General', icon: Settings, content: <GeneralTab /> },
//       { id: 'advanced', label: 'Advanced', icon: Sliders, content: <AdvancedTab /> }
//     ]}
//     defaultTab="general"
//   />
//
// PROPS:
//   title      — Page title (string, optional)
//   subtitle   — Page subtitle (string, optional)
//   icon       — Lucide icon component for header (optional)
//   tabs       — Array of { id, label, icon, content, separator? } (required)
//   defaultTab — ID of initially active tab (optional, defaults to first tab)
//
// ARCHITECTURE: Fully reusable, accepts any number of tabs. Each module can
// pass its own tab configuration with custom content components.
// ============================================================================
import React, { useState } from 'react';

export default function ConfigLayout({ title, subtitle, icon: HeaderIcon, tabs = [], defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const activeTabObj = tabs.find(t => t.id === activeTab);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      {title && (
        <div className="flex items-center gap-3 mb-2">
          {HeaderIcon && (
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <HeaderIcon size={20} className="text-brand-600" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-surface-800">{title}</h1>
            {subtitle && <p className="text-sm text-surface-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      )}

      {/* Tab layout: vertical tabs left + content right */}
      <div className="flex gap-6">
        {/* Tab list */}
        <div className="w-56 shrink-0 space-y-1">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = tab.id === activeTab;
            return (
              <React.Fragment key={tab.id}>
                {tab.separator && <div className="border-t border-surface-200 my-2" />}
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 shadow-sm shadow-brand-100/50'
                      : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50'
                  }`}
                >
                  {TabIcon && <TabIcon size={16} className={isActive ? 'text-brand-600' : 'text-surface-400'} />}
                  {tab.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Active tab content */}
        <div className="flex-1 min-w-0">
          {activeTabObj?.content}
        </div>
      </div>
    </div>
  );
}
