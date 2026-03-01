// ============================================================================
// Shared Module — Barrel Export (PulseOps V2)
//
// PURPOSE: SINGLE entry point for all shared components, layouts, hooks,
// services, and utilities. Every module imports from '@shared' — never
// from deep relative paths.
//
// USAGE:
//   import { Button, Card } from '@shared';
// ============================================================================

// --- Components (Design System) ---
export { default as Button } from '@shared/components/Button';
export { default as LoginForm } from '@shared/components/LoginForm';
export { default as TestPage } from '@shared/components/TestPage';

// --- Services ---
// export { default as ApiClient } from '@shared/services/apiClient';

// --- Hooks ---
// (Add hooks as they are created)

// --- Contexts ---
// (Add contexts as they are created)
