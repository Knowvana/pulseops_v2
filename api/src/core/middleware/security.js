// ============================================================================
// Security Middleware — PulseOps V2 API
//
// PURPOSE: Enterprise-grade security middleware chain. Provides Helmet.js
// HTTP headers, rate limiting (general + auth), request ID tracking,
// and XSS input sanitization.
//
// MIDDLEWARE ORDER (per .windsurfrules Section 2.7):
//   1. helmetMiddleware   → HTTP security headers (CSP, HSTS, XSS, clickjacking)
//   2. requestIdMiddleware → UUID per request for distributed tracing
//   3. generalRateLimiter  → 100 req/15min per IP (general)
//   4. authRateLimiter     → 10 req/15min per IP (login endpoint)
//   5. inputSanitizer      → Strip XSS patterns from body/query/params
//
// ARCHITECTURE: Each export is a standalone Express middleware. They are
// mounted in app.js in the order above, BEFORE any route handlers.
//
// DEPENDENCIES:
//   - helmet (npm)
//   - express-rate-limit (npm)
//   - crypto (Node.js built-in)
//   - ../shared/logger.js → structured logging
//   - ../config/APIErrors.json → error messages (via loadJson)
// ============================================================================
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { errors } from '#shared/loadJson.js';
import { logger } from '#shared/logger.js';

// ── 1. Helmet.js: HTTP Security Headers ─────────────────────────────────────
export const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
});

// ── 2. Request ID: UUID per request ─────────────────────────────────────────
export function requestIdMiddleware(req, _res, next) {
  req.requestId = crypto.randomUUID();
  next();
}

// ── 6. Request/Response Logger: Detailed API call tracking ─────────────────
export function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  // Log incoming request
  logger.info(`[${req.requestId}] → ${req.method} ${req.path}`, {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    body: req.method !== 'GET' && req.body ? { ...req.body, password: req.body.password ? '***' : undefined } : undefined,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Capture original res.json to log responses
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    logger.info(`[${req.requestId}] ← ${res.statusCode} ${req.method} ${req.path} (${duration}ms)`, {
      requestId: req.requestId,
      statusCode: res.statusCode,
      duration,
      success: data?.success,
      error: data?.error?.message
    });

    // Persist API log entry (skip /logs endpoints to prevent recursion)
    if (!req.path.startsWith('/api/logs')) {
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      const safeBody = req.method !== 'GET' && req.body
        ? { ...req.body, password: undefined, password_hash: undefined }
        : undefined;
      import('#core/services/logService.js').then(mod => {
        mod.default.writeApiLog({
          transactionId: req.requestId,
          level,
          source: 'API',
          user: req.user?.email || null,
          module: 'Core',
          url: req.originalUrl || req.path,
          method: req.method,
          statusCode: res.statusCode,
          responseTime: duration,
          requestBody: safeBody,
          responseBody: data,
          error: data?.error?.message || null,
          timestamp: new Date().toISOString(),
        });
      }).catch(() => {});
    }
    
    return originalJson(data);
  };

  next();
}

// ── 3. General Rate Limiter: 100 req / 15 min ──────────────────────────────
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: errors.errors.rateLimitExceeded, code: 'RATE_LIMIT' },
  },
});

// ── 4. Auth Rate Limiter: 10 req / 15 min ──────────────────────────────────
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: errors.errors.authRateLimitExceeded, code: 'AUTH_RATE_LIMIT' },
  },
});

// ── 5. Input Sanitizer: Strip XSS patterns ─────────────────────────────────
/**
 * Recursively sanitize string values in an object by stripping common
 * XSS attack vectors: <script> tags, javascript: URIs, inline event handlers.
 * Applied to req.body, req.query, and req.params.
 */
export function inputSanitizer(req, _res, next) {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .replace(/(<\s*)(\/?\s*)(script|iframe|object|embed|applet)/gi, '');
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
    return obj;
  };

  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
}
