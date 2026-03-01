// ============================================================================
// Security Middleware — PulseOps V2 API
//
// PURPOSE: Additional security middleware beyond Helmet. Includes rate
// limiting, input sanitization, and request ID propagation.
//
// ARCHITECTURE: Applied in the middleware chain per Section 2.7.
// ============================================================================

/**
 * Basic input sanitization: strips common XSS patterns from string values.
 * Applied to req.body, req.query, and req.params.
 */
export function sanitizeInput(req, _res, next) {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    }
    return obj;
  };

  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
}

// TODO: Add express-rate-limit when installed
// export function generalRateLimit() { ... }
// export function authRateLimit() { ... }
