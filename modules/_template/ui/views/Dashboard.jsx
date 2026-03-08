// ============================================================================
// Dashboard View Template — PulseOps V2 Module
//
// PURPOSE: Default dashboard view for a plug-and-play module.
// Replace this with your module's actual dashboard content.
// ============================================================================
import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function Dashboard({ user }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <LayoutDashboard size={20} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-surface-800">Module Dashboard</h1>
          <p className="text-sm text-surface-500 mt-0.5">Replace this with your module content</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-8 shadow-sm flex flex-col items-center justify-center">
        <LayoutDashboard size={40} className="text-surface-300 mb-3" />
        <h3 className="text-sm font-bold text-surface-700 mb-1">Your Module Dashboard</h3>
        <p className="text-xs text-surface-400 text-center max-w-sm">
          Build your module's dashboard here. Add statistics, charts, and quick actions.
        </p>
      </div>
    </div>
  );
}
