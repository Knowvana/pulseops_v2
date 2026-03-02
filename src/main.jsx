// ============================================================================
// Main Entry Point — PulseOps V2
//
// PURPOSE: Bootstraps the React application and mounts it to the DOM.
// Imports the global design tokens (index.css) before rendering.
//
// ARCHITECTURE: Wraps App in StrictMode for development checks.
// ============================================================================
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@core/App';
import '@src/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
