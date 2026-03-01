// ============================================================================
// TestPage Component — PulseOps V2
//
// PURPOSE: Central testing page for all UI components during development.
// All new components should be added here for visual verification.
//
// USAGE: Import in main.jsx for development testing.
// ============================================================================
import React from 'react';
import { LogIn } from 'lucide-react';
import Button from '@shared/components/Button';
import LoginForm from '@shared/components/LoginForm';

export default function TestPage() {
  const handleLogin = async (email, password) => {
    console.log('Login attempt:', { email, password });
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
  };

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <div className="bg-white border-b border-surface-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-surface-800">PulseOps V2 — Component Test Page</h1>
        <p className="text-sm text-surface-500 mt-1">Visual verification for all UI components</p>
      </div>

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Button Component Test */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-surface-200">
          <h2 className="text-xl font-bold text-surface-800 mb-4">Button Component</h2>
          <p className="text-sm text-surface-600 mb-4">Primary button with gradient matching LoginForm</p>
          <div className="flex gap-4">
            <Button variant="primary" icon={<LogIn />}>
              Sign In
            </Button>
          </div>
        </section>

        {/* LoginForm Component Test */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-surface-200">
          <h2 className="text-xl font-bold text-surface-800 mb-4">LoginForm Component</h2>
          <p className="text-sm text-surface-600 mb-6">Full login form with gradient background and button</p>
          <LoginForm onLogin={handleLogin} />
        </section>
      </div>
    </div>
  );
}
