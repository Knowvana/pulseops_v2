// ============================================================================
// Auth Middleware — PulseOps V2 API
//
// PURPOSE: JWT authentication middleware implementing Dual-Auth Protocol.
// Checks Authorization header (Bearer) first, then falls back to
// HttpOnly cookies. Supports both frontend and API tool authentication.
//
// DEPENDENCIES:
//   - jsonwebtoken (install when implementing)
//   - ../config/index.js → JWT secret
// ============================================================================

/**
 * Authenticate requests via Bearer token or HttpOnly cookie.
 * Attaches decoded user to req.user on success.
 */
export function authenticate(req, res, next) {
  let token = null;

  // 1. Check Authorization Header (Bearer) — For Swagger/Postman
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  // 2. Fallback to HttpOnly Cookie — For Frontend
  else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required. Provide a Bearer token or cookie.' },
    });
  }

  // TODO: Verify JWT token when jsonwebtoken is installed
  // try {
  //   const decoded = jwt.verify(token, config.auth.jwtSecret);
  //   req.user = decoded;
  //   next();
  // } catch (err) {
  //   return res.status(401).json({
  //     success: false,
  //     error: { message: 'Invalid or expired token.' },
  //   });
  // }

  next();
}

/**
 * Role-based access control middleware.
 * @param  {...string} roles - Allowed roles
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions.' },
      });
    }
    next();
  };
}
