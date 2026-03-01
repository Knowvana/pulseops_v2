// ============================================================================
// Express App Factory — PulseOps V2 API
//
// PURPOSE: Creates and configures the Express application with enterprise
// middleware chain in the MANDATORY order defined in .windsurfrules.
//
// MIDDLEWARE ORDER (Section 2.7):
//   1. Helmet.js → HTTP security headers
//   2. Request ID → UUID per request
//   3. CORS → credentials: true
//   4. Cookie Parser → HttpOnly cookies
//   5. JSON Body Parser → 10MB limit
//   6. Request Logging
//   7. Routes (public + protected)
//   8. 404 Handler
//   9. Global Error Handler
// ============================================================================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { config } from './config/index.js';
import { registerRoutes } from './core/routes/index.js';

export function createApp() {
  const app = express();

  // --- 1. Helmet.js: HTTP Security Headers ---
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  // --- 2. Request ID: UUID per request for distributed tracing ---
  app.use((req, _res, next) => {
    req.requestId = crypto.randomUUID();
    next();
  });

  // --- 3. CORS: Whitelist-based with credentials ---
  app.use(cors({
    origin: config.frontendOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // --- 4. Cookie Parser ---
  app.use(cookieParser());

  // --- 5. JSON Body Parser (10MB limit) ---
  app.use(express.json({ limit: '10mb' }));

  // --- 6. Request Logging ---
  app.use((req, _res, next) => {
    console.log(`[${req.requestId}] ${req.method} ${req.url}`);
    next();
  });

  // --- 7. Routes ---
  registerRoutes(app);

  // --- 8. 404 Handler ---
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { message: 'Route not found', code: 'NOT_FOUND' },
    });
  });

  // --- 9. Global Error Handler ---
  app.use((err, req, res, _next) => {
    console.error(`[${req.requestId}] Unhandled error:`, err.message);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        requestId: req.requestId,
      },
    });
  });

  return app;
}
