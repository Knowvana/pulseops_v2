// ============================================================================
// Logger — PulseOps V2 API
//
// PURPOSE: Centralized logging with request ID support. Placeholder for
// Winston integration.
//
// USAGE: import { logger } from '../shared/logger.js';
//        logger.info('message', { context });
// ============================================================================

export const logger = {
  info: (message, context = {}) => {
    console.log(`[INFO] ${message}`, Object.keys(context).length ? context : '');
  },
  warn: (message, context = {}) => {
    console.warn(`[WARN] ${message}`, Object.keys(context).length ? context : '');
  },
  error: (message, context = {}) => {
    console.error(`[ERROR] ${message}`, Object.keys(context).length ? context : '');
  },
  debug: (message, context = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, Object.keys(context).length ? context : '');
    }
  },
};
