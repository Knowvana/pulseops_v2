// ============================================================================
// Main Entry Point — PulseOps V2
//
// PURPOSE: Bootstraps the React application and mounts it to the DOM.
// Imports the global design tokens (index.css) before rendering.
//
// ARCHITECTURE: Wraps App in StrictMode for development checks.
// ============================================================================
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@core/App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
