// ============================================================================
// Connection Tab Template — PulseOps V2 Module
//
// PURPOSE: Default config tab for a plug-and-play module.
// Replace this with your module's actual configuration UI.
// ============================================================================
import React from 'react';
import { Wifi } from 'lucide-react';

export default function ConnectionTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Wifi size={16} className="text-brand-600" />
        <h3 className="text-sm font-bold text-surface-700">Connection Settings</h3>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-sm">
        <p className="text-xs text-surface-400">
          Replace this with your module's connection configuration form.
        </p>
      </div>
    </div>
  );
}
