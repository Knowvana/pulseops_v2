// ============================================================================
// TemplateReports — PulseOps V2 Module Template
//
// PURPOSE: Default reports view for a new module. Replace with analytics,
// data tables, and export functionality.
//
// DEPENDENCIES:
//   - @modules/_template/uiText.json → UI strings
// ============================================================================
import React from 'react';
import uiText from '@modules/_template/uiText.json';

export default function TemplateReports() {
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-surface-800 mb-1">{uiText.reports.title}</h2>
      <p className="text-sm text-surface-500 mb-6">{uiText.reports.subtitle}</p>
      <div className="bg-white rounded-xl border border-surface-200 p-8 text-center">
        <p className="text-surface-400 text-sm">{uiText.common.loading}</p>
      </div>
    </div>
  );
}
