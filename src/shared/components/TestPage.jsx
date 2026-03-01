// ============================================================================
// TestPage — PulseOps V2 Component Testing
//
// PURPOSE: Simple test page to verify all shared components work correctly
// before the full app is ready.
// ============================================================================
import React, { useState } from 'react';
import Button from '@shared/components/Button';
import LoginForm from '@shared/components/LoginForm';
import { Save, Trash2, Plus, Settings } from 'lucide-react';
import globalText from '@config/globalText.json';

const { platform, common, login: loginCopy } = globalText;

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
    <div className="min-h-screen bg-surface-50 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-10">
        <div>
          <h1 className="text-3xl font-bold text-surface-900 mb-2">
            {platform.name} Component Testbed
          </h1>
          <p className="text-surface-600">
            Interactive sandbox showcasing every shared UI element. New components must be wired here for rapid visual validation.
          </p>
        </div>
        
        {/* Button Variants Test */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6">
          <h2 className="text-lg font-semibold text-surface-800 mb-4">Button Variants</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger" icon={Trash2}>{common.delete}</Button>
            <Button variant="ghost">{common.cancel}</Button>
          </div>
        </div>

        {/* Button Sizes Test */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6">
          <h2 className="text-lg font-semibold text-surface-800 mb-4">Button Sizes</h2>
          <div className="flex items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg" icon={Plus}>Large Action</Button>
          </div>
        </div>

        {/* Button States Test */}
        <div className="bg-white rounded-2xl shadow-sm border border-surface-200 p-6">
          <h2 className="text-lg font-semibold text-surface-800 mb-4">Button States</h2>
          <div className="flex flex-wrap gap-3">
            <Button 
              loading={loading} 
              onClick={handleSave}
              icon={Save}
            >
              {loading ? common.saving : 'Save Changes'}
            </Button>
            <Button disabled>{common.disabled} Button</Button>
            <Button variant="ghost" icon={Settings}>Settings</Button>
          </div>
          {clickCount > 0 && (
            <p className="mt-3 text-sm text-surface-600">{common.save} clicked {clickCount} times</p>
          )}
        </div>

        {/* Test Results */}
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-brand-800 mb-2">✅ What to Verify:</h3>
          <ul className="text-sm text-brand-700 space-y-1">
            <li>• All buttons render with correct colors and sizes</li>
            <li>• Hover states work (move mouse over buttons)</li>
            <li>• Loading state shows spinner and disables button</li>
            <li>• Icons appear correctly sized</li>
            <li>• Click handlers work (try the Save button)</li>
          </ul>
        </div>

        {/* Login Form Showcase */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-surface-900">
              {loginCopy.title}
            </h2>
            <p className="text-surface-600">Full-screen authentication experience embedded for smoke testing.</p>
          </div>
          <div className="rounded-3xl border border-surface-200 shadow-lg overflow-hidden">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
