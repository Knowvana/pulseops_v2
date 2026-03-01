// ============================================================================
// TestPage — PulseOps V2 Component Testing
//
// PURPOSE: Simple test page to verify all shared components work correctly
// before the full app is ready.
// ============================================================================
import React, { useState } from 'react';
import Button from '@shared/components/Button';
import { Save, Trash2, Plus, Settings } from 'lucide-react';

export default function TestPage() {
  const [loading, setLoading] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setClickCount(prev => prev + 1);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">PulseOps V2 Component Test</h1>
        
        {/* Button Variants Test */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Button Variants</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger" icon={Trash2}>Delete</Button>
            <Button variant="ghost">Cancel</Button>
          </div>
        </div>

        {/* Button Sizes Test */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Button Sizes</h2>
          <div className="flex items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg" icon={Plus}>Large Action</Button>
          </div>
        </div>

        {/* Button States Test */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Button States</h2>
          <div className="flex flex-wrap gap-3">
            <Button 
              loading={loading} 
              onClick={handleSave}
              icon={Save}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button disabled>Disabled Button</Button>
            <Button variant="ghost" icon={Settings}>Settings</Button>
          </div>
          {clickCount > 0 && (
            <p className="mt-3 text-sm text-gray-600">Save clicked {clickCount} times</p>
          )}
        </div>

        {/* Test Results */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">✅ What to Verify:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• All buttons render with correct colors and sizes</li>
            <li>• Hover states work (move mouse over buttons)</li>
            <li>• Loading state shows spinner and disables button</li>
            <li>• Icons appear correctly sized</li>
            <li>• Click handlers work (try the Save button)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
